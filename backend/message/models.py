from django.db import models
from django.conf import settings
import uuid


class Message(models.Model):
    """Messages entre utilisateurs (texte ou vocal)"""
    
    TYPE_CHOICES = [
        ('TEXTE', 'Texte'),
        ('VOCAL', 'Vocal'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages_envoyes'
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages_recus'
    )
    mission = models.ForeignKey(
        'mission.Mission',
        on_delete=models.CASCADE,
        related_name='messages',
        help_text="Mission associée à cette conversation"
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='TEXTE')
    contenu = models.TextField(blank=True, help_text="Contenu du message texte")
    audio_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL Cloudinary du fichier audio pour messages vocaux"
    )
    date_envoi = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['date_envoi']
        indexes = [
            models.Index(fields=['mission', 'date_envoi']),
            models.Index(fields=['expediteur', 'date_envoi']),
            models.Index(fields=['destinataire', 'date_envoi']),
        ]
    
    def __str__(self):
        return f"{self.expediteur.username} -> {self.destinataire.username} ({self.type})"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validation: TEXTE doit avoir du contenu
        if self.type == 'TEXTE' and not self.contenu.strip():
            raise ValidationError("Un message texte doit avoir du contenu")
        
        # Validation: VOCAL doit avoir une URL audio
        if self.type == 'VOCAL' and not self.audio_url:
            raise ValidationError("Un message vocal doit avoir une URL audio")
    
    @property
    def conversation_id(self):
        """Identifiant unique de la conversation (mission_id)"""
        return str(self.mission.id)


class MessageLu(models.Model):
    """Suivi de lecture des messages"""
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='lectures'
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages_lus'
    )
    date_lecture = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['message', 'utilisateur']
        verbose_name_plural = "Messages lus"
    
    def __str__(self):
        return f"{self.utilisateur.username} a lu {self.message.id}"
