from rest_framework import serializers
from .models import Message, MessageLu
from User.models import User


class UserMinimalSerializer(serializers.ModelSerializer):
    """Serializer minimal pour afficher les infos utilisateur dans les messages"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_picture']
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages (texte et vocal)"""
    expediteur_info = UserMinimalSerializer(source='expediteur', read_only=True)
    destinataire_info = UserMinimalSerializer(source='destinataire', read_only=True)
    est_lu = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id',
            'expediteur',
            'expediteur_info',
            'destinataire',
            'destinataire_info',
            'mission',
            'type',
            'contenu',
            'audio_url',
            'date_envoi',
            'est_lu',
        ]
        read_only_fields = ['id', 'expediteur', 'date_envoi']
    
    def get_est_lu(self, obj):
        """Vérifie si le message a été lu par le destinataire"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return MessageLu.objects.filter(
                message=obj,
                utilisateur=request.user
            ).exists()
        return False
    
    def validate(self, data):
        """Validation des messages"""
        msg_type = data.get('type')
        contenu = data.get('contenu', '').strip()
        audio_url = data.get('audio_url')
        
        # Validation TEXTE
        if msg_type == 'TEXTE' and not contenu:
            raise serializers.ValidationError({
                'contenu': 'Un message texte doit avoir du contenu'
            })
        
        # Validation VOCAL
        if msg_type == 'VOCAL' and not audio_url:
            raise serializers.ValidationError({
                'audio_url': 'Un message vocal doit avoir une URL audio Cloudinary'
            })
        
        return data
    
    def create(self, validated_data):
        """Création d'un message avec l'expéditeur automatique"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['expediteur'] = request.user
        return super().create(validated_data)


class MessageLuSerializer(serializers.ModelSerializer):
    """Serializer pour marquer un message comme lu"""
    
    class Meta:
        model = MessageLu
        fields = ['message', 'utilisateur', 'date_lecture']
        read_only_fields = ['utilisateur', 'date_lecture']
    
    def create(self, validated_data):
        """Création avec l'utilisateur automatique"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['utilisateur'] = request.user
        
        # Éviter les doublons avec get_or_create
        message_lu, created = MessageLu.objects.get_or_create(
            message=validated_data['message'],
            utilisateur=validated_data['utilisateur']
        )
        return message_lu


class ConversationSerializer(serializers.Serializer):
    """Serializer pour afficher les conversations groupées par mission"""
    mission_id = serializers.UUIDField()
    mission_titre = serializers.CharField()
    autre_utilisateur = UserMinimalSerializer()
    dernier_message = MessageSerializer()
    nb_non_lus = serializers.IntegerField()
    date_dernier_message = serializers.DateTimeField()
