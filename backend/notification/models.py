from django.db import models
from django.conf import settings
import uuid


class Notification(models.Model):
    """Notifications système pour les événements de la plateforme"""
    
    TYPE_CHOICES = [
        ('PROPOSITION_ACCEPTEE', 'Proposition acceptée'),
        ('PROPOSITION_REJETEE', 'Proposition rejetée'),
        ('MISSION_DEMARREE', 'Mission démarrée'),
        ('MISSION_LIVREE', 'Mission livrée'),
        ('MISSION_COMPLETEE', 'Mission complétée'),
        ('MISSION_ANNULEE', 'Mission annulée'),
        ('MISSION_LITIGE', 'Litige ouvert'),
        ('PAIEMENT_REUSSI', 'Paiement réussi'),
        ('PAIEMENT_ECHOUE', 'Paiement échoué'),
        ('NOUVEAU_MESSAGE', 'Nouveau message'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    titre = models.CharField(max_length=255)
    message = models.TextField()
    lue = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_lecture = models.DateTimeField(null=True, blank=True)
    
    # Liens optionnels vers les objets concernés
    mission = models.ForeignKey(
        'mission.Mission',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    proposition = models.ForeignKey(
        'proposition.Proposition',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    paiement = models.ForeignKey(
        'paiement.Paiement',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    message_obj = models.ForeignKey(
        'message.Message',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Message concerné (pour type NOUVEAU_MESSAGE)"
    )
    
    class Meta:
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['utilisateur', '-date_creation']),
            models.Index(fields=['utilisateur', 'lue']),
        ]
    
    def __str__(self):
        return f"{self.type} pour {self.utilisateur.username}"
    
    def marquer_comme_lue(self):
        """Marque la notification comme lue"""
        from django.utils import timezone
        if not self.lue:
            self.lue = True
            self.date_lecture = timezone.now()
            self.save(update_fields=['lue', 'date_lecture'])
