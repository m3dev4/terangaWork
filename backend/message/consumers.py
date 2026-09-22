import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Message, MessageLu
from .serializers import MessageSerializer

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer pour la messagerie et notifications en temps réel.
    
    Supporte le multiplexing sur 2 canaux:
    - chat.{mission_id} : messages d'une conversation
    - notifications.{user_id} : notifications d'un utilisateur
    """
    
    async def connect(self):
        """Connexion WebSocket avec authentification JWT"""
        # Récupérer le token JWT depuis les query params
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break
        
        if not token:
            await self.close(code=4001)
            return
        
        # Valider le token et récupérer l'utilisateur
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            self.user = await self.get_user(user_id)
            
            if not self.user or not self.user.is_active:
                await self.close(code=4002)
                return
        except Exception as e:
            await self.close(code=4003)
            return
        
        # Accepter la connexion
        await self.accept()
        
        # Initialiser les groupes actifs
        self.active_groups = set()
        
        # Auto-join au canal de notifications personnel
        notification_group = f"notifications.{self.user.id}"
        self.active_groups.add(notification_group)
        await self.channel_layer.group_add(notification_group, self.channel_name)
    
    async def disconnect(self, close_code):
        """Déconnexion - quitter tous les groupes"""
        for group in self.active_groups:
            await self.channel_layer.group_discard(group, self.channel_name)
    
    async def receive(self, text_data):
        """
        Réception des messages du client.
        
        Format attendu:
        {
            "action": "subscribe" | "unsubscribe" | "send_message" | "mark_read",
            "channel": "chat.{mission_id}" | "notifications.{user_id}",
            "data": {...}
        }
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            channel = data.get('channel', '')
            payload = data.get('data', {})
            
            if action == 'subscribe':
                await self.handle_subscribe(channel)
            
            elif action == 'unsubscribe':
                await self.handle_unsubscribe(channel)
            
            elif action == 'send_message':
                await self.handle_send_message(channel, payload)
            
            elif action == 'mark_read':
                await self.handle_mark_read(payload)
            
            else:
                await self.send_error(f"Action inconnue: {action}")
        
        except json.JSONDecodeError:
            await self.send_error("Format JSON invalide")
        except Exception as e:
            await self.send_error(f"Erreur: {str(e)}")
    
    async def handle_subscribe(self, channel):
        """S'abonner à un canal (chat.{mission_id})"""
        if not channel.startswith('chat.'):
            await self.send_error("Canal invalide pour subscribe")
            return
        
        # Vérifier les permissions
        mission_id = channel.split('.')[1]
        has_access = await self.check_mission_access(mission_id)
        
        if not has_access:
            await self.send_error("Accès refusé à cette mission")
            return
        
        # Rejoindre le groupe
        self.active_groups.add(channel)
        await self.channel_layer.group_add(channel, self.channel_name)
        
        await self.send(text_data=json.dumps({
            'type': 'subscribed',
            'channel': channel
        }))
    
    async def handle_unsubscribe(self, channel):
        """Se désabonner d'un canal"""
        if channel in self.active_groups:
            self.active_groups.remove(channel)
            await self.channel_layer.group_discard(channel, self.channel_name)
            
            await self.send(text_data=json.dumps({
                'type': 'unsubscribed',
                'channel': channel
            }))
    
    async def handle_send_message(self, channel, payload):
        """Envoyer un message dans une conversation"""
        if not channel.startswith('chat.'):
            await self.send_error("Canal invalide pour send_message")
            return
        
        mission_id = channel.split('.')[1]
        
        # Créer le message en DB
        try:
            message = await self.create_message(mission_id, payload)
            
            # Broadcaster le message à tous les participants
            await self.channel_layer.group_send(
                channel,
                {
                    'type': 'chat_message',
                    'message': message
                }
            )
        except Exception as e:
            await self.send_error(f"Erreur création message: {str(e)}")
    
    async def handle_mark_read(self, payload):
        """Marquer un message comme lu"""
        message_id = payload.get('message_id')
        
        if not message_id:
            await self.send_error("message_id requis")
            return
        
        try:
            await self.mark_message_read(message_id)
            
            await self.send(text_data=json.dumps({
                'type': 'message_read',
                'message_id': message_id
            }))
        except Exception as e:
            await self.send_error(f"Erreur marquage lecture: {str(e)}")
    
    # Handlers pour les événements broadcastés
    
    async def chat_message(self, event):
        """Handler pour recevoir un message du groupe chat"""
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': event['message']
        }))
    
    async def notification_event(self, event):
        """Handler pour recevoir une notification du groupe notifications"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
    
    # Méthodes utilitaires
    
    async def send_error(self, message):
        """Envoyer une erreur au client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))
    
    @database_sync_to_async
    def get_user(self, user_id):
        """Récupérer un utilisateur par ID"""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def check_mission_access(self, mission_id):
        """Vérifier si l'utilisateur a accès à la mission"""
        from mission.models import Mission
        from proposition.models import Proposition
        
        try:
            mission = Mission.objects.get(id=mission_id)
            
            # L'annonceur a toujours accès
            if mission.annonceur_id == self.user.id:
                return True
            
            # Le freelance ayant une proposition acceptée a accès
            if Proposition.objects.filter(
                mission=mission,
                freelancee_id=self.user.id,
                statut='ACCEPTEE'
            ).exists():
                return True
            
            return False
        except Mission.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_message(self, mission_id, payload):
        """Créer un message en base de données"""
        from mission.models import Mission
        
        mission = Mission.objects.get(id=mission_id)
        
        # Déterminer le destinataire
        if mission.annonceur_id == self.user.id:
            # L'annonceur envoie au freelance
            proposition_acceptee = mission.propositions.filter(statut='ACCEPTEE').first()
            if not proposition_acceptee:
                raise ValueError("Aucune proposition acceptée pour cette mission")
            destinataire = proposition_acceptee.freelancee
        else:
            # Le freelance envoie à l'annonceur
            destinataire = mission.annonceur
        
        # Créer le message
        message = Message.objects.create(
            expediteur=self.user,
            destinataire=destinataire,
            mission=mission,
            type=payload.get('type', 'TEXTE'),
            contenu=payload.get('contenu', ''),
            audio_url=payload.get('audio_url')
        )
        
        # Serializer pour renvoyer au client
        serializer = MessageSerializer(message)
        return serializer.data
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Marquer un message comme lu"""
        message = Message.objects.get(id=message_id)
        
        # Vérifier que l'utilisateur est le destinataire
        if message.destinataire_id != self.user.id:
            raise ValueError("Vous n'êtes pas le destinataire de ce message")
        
        # Créer ou récupérer le marquage de lecture
        MessageLu.objects.get_or_create(
            message=message,
            utilisateur=self.user
        )
