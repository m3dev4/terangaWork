from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Max, Count, Exists, OuterRef
from .models import Message, MessageLu
from .serializers import MessageSerializer, MessageLuSerializer, ConversationSerializer


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des messages.
    
    Endpoints:
    - GET /api/messages/ : Liste de toutes les conversations de l'utilisateur
    - GET /api/messages/conversation/{mission_id}/ : Historique d'une conversation
    - POST /api/messages/ : Envoyer un message (via REST, pas WebSocket)
    - POST /api/messages/{id}/mark_read/ : Marquer un message comme lu
    """
    
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne uniquement les messages de l'utilisateur connecté"""
        user = self.request.user
        return Message.objects.filter(
            Q(expediteur=user) | Q(destinataire=user)
        ).select_related('expediteur', 'destinataire', 'mission').order_by('-date_envoi')
    
    def list(self, request):
        """
        Liste toutes les conversations de l'utilisateur groupées par mission.
        
        Retourne pour chaque mission:
        - Dernier message
        - Nombre de messages non lus
        - Info de l'autre utilisateur
        """
        user = request.user
        
        # Récupérer toutes les missions où l'utilisateur a des messages
        messages = self.get_queryset()
        
        # Grouper par mission
        missions_dict = {}
        
        for message in messages:
            mission_id = str(message.mission.id)
            
            if mission_id not in missions_dict:
                # Déterminer l'autre utilisateur
                autre_user = message.destinataire if message.expediteur == user else message.expediteur
                
                # Compter les messages non lus
                nb_non_lus = Message.objects.filter(
                    mission=message.mission,
                    destinataire=user
                ).exclude(
                    lectures__utilisateur=user
                ).count()
                
                # Vérifier si la mission est active
                is_linked = message.mission.status in ['OPEN', 'IN_PROGRESS', 'DELIVERED']

                profile_pic = None
                if autre_user.profile_picture:
                    try:
                        profile_pic = request.build_absolute_uri(autre_user.profile_picture.url)
                    except Exception:
                        profile_pic = str(autre_user.profile_picture)

                user_dict = {
                    'id': autre_user.id,
                    'email': autre_user.email,
                    'first_name': autre_user.first_name,
                    'last_name': autre_user.last_name,
                    'profile_picture': profile_pic,
                }

                mission_title = getattr(message.mission, 'title', getattr(message.mission, 'titre', f"Mission #{message.mission.id}"))

                missions_dict[mission_id] = {
                    'mission_id': message.mission.id,
                    'mission_titre': mission_title,
                    'mission_status': message.mission.status,
                    'is_linked': is_linked,
                    'autre_utilisateur': user_dict,
                    'autre_utlisateur': user_dict,
                    'dernier_message': MessageSerializer(message, context={'request': request}).data,
                    'nb_non_lus': nb_non_lus,
                    'date_dernier_message': message.date_envoi
                }
        
        # Convertir en liste et trier par date
        conversations = sorted(
            missions_dict.values(),
            key=lambda x: x['date_dernier_message'],
            reverse=True
        )
        
        return Response(conversations)
    
    @action(detail=False, methods=['get'], url_path='conversation/(?P<mission_id>[^/.]+)')
    def conversation(self, request, mission_id=None):
        """
        Récupère l'historique complet d'une conversation (tous les messages d'une mission).
        
        Pagination: ?page=1&page_size=50
        """
        user = request.user
        
        # Vérifier l'accès à la mission
        from mission.models import Mission
        from proposition.models import Proposition
        
        try:
            mission = Mission.objects.get(id=mission_id)
        except Mission.DoesNotExist:
            return Response(
                {'error': 'Mission introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Vérifier les permissions
        is_annonceur = (
            hasattr(mission, 'annonceur') and 
            (mission.annonceur.user_id == user.id or mission.annonceur.user == user)
        )
        is_freelance = Proposition.objects.filter(
            mission=mission,
            freelance__user=user
        ).exists()
        
        if not (is_annonceur or is_freelance):
            return Response(
                {'error': 'Accès refusé à cette conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer les messages
        messages = Message.objects.filter(
            mission_id=mission_id
        ).select_related('expediteur', 'destinataire').order_by('date_envoi')
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_messages = messages[start:end]
        
        serializer = MessageSerializer(
            paginated_messages,
            many=True,
            context={'request': request}
        )
        
        mission_title = getattr(mission, 'title', getattr(mission, 'titre', f"Mission #{mission.id}"))

        return Response({
            'mission_id': mission_id,
            'mission_titre': mission_title,
            'total': messages.count(),
            'page': page,
            'page_size': page_size,
            'messages': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marquer un message comme lu"""
        message = self.get_object()
        
        # Vérifier que l'utilisateur est le destinataire
        if message.destinataire != request.user:
            return Response(
                {'error': 'Vous n\'êtes pas le destinataire de ce message'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Marquer comme lu
        message_lu, created = MessageLu.objects.get_or_create(
            message=message,
            utilisateur=request.user
        )
        
        return Response({
            'message': 'Message marqué comme lu',
            'created': created
        })
    
    @action(detail=False, methods=['post'], url_path='mark_all_read/(?P<mission_id>[^/.]+)')
    def mark_all_read(self, request, mission_id=None):
        """Marquer tous les messages d'une conversation comme lus"""
        user = request.user
        
        # Récupérer tous les messages non lus de cette mission
        messages_non_lus = Message.objects.filter(
            mission_id=mission_id,
            destinataire=user
        ).exclude(
            lectures__utilisateur=user
        )
        
        # Créer les MessageLu
        count = 0
        for message in messages_non_lus:
            MessageLu.objects.get_or_create(
                message=message,
                utilisateur=user
            )
            count += 1
        
        return Response({
            'message': f'{count} message(s) marqué(s) comme lu(s)'
        })
    
    def create(self, request):
        """
        Créer un nouveau message via REST API.
        Envoie en temps réel via WebSocket aux abonnés du canal et au destinataire.
        """
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        
        # Notifier le destinataire (envoie WebSocket sur notifications.{destinataire_id})
        from notification.services import notifier_nouveau_message
        notifier_nouveau_message(message)
        
        # Broadcaster sur le canal WebSocket chat.{mission_id}
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"chat.{message.mission_id}",
                    {
                        'type': 'chat_message',
                        'message': serializer.data
                    }
                )
        except Exception as e:
            print(f"⚠️ Erreur WebSocket broadcast message REST: {e}")
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
