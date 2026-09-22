from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications"""
    
    # Info additionnelles pour les objets liés
    mission_titre = serializers.CharField(source='mission.titre', read_only=True, allow_null=True)
    proposition_id = serializers.UUIDField(source='proposition.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'utilisateur',
            'type',
            'titre',
            'message',
            'lue',
            'date_creation',
            'date_lecture',
            'mission',
            'mission_titre',
            'proposition',
            'proposition_id',
            'paiement',
            'message_obj',
        ]
        read_only_fields = [
            'id',
            'utilisateur',
            'date_creation',
            'date_lecture',
            'mission_titre',
            'proposition_id',
        ]
    
    def update(self, instance, validated_data):
        """Seul le champ 'lue' peut être modifié via l'API"""
        if 'lue' in validated_data and validated_data['lue'] and not instance.lue:
            instance.marquer_comme_lue()
        return instance


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une notification (usage interne)"""
    
    class Meta:
        model = Notification
        fields = [
            'utilisateur',
            'type',
            'titre',
            'message',
            'mission',
            'proposition',
            'paiement',
            'message_obj',
        ]
    
    def validate_type(self, value):
        """Validation du type de notification"""
        types_valides = [choice[0] for choice in Notification.TYPE_CHOICES]
        if value not in types_valides:
            raise serializers.ValidationError(
                f"Type invalide. Choix: {', '.join(types_valides)}"
            )
        return value


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de notifications"""
    total = serializers.IntegerField()
    non_lues = serializers.IntegerField()
    par_type = serializers.DictField()
