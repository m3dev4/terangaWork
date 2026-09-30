from django.conf import settings
from django.db import models


class ChatRole(models.TextChoices):
    UTILISATEUR = "utilisateur", "Utilisateur"
    ASSISTANT = "assistant", "Assistant"


class ChatConversation(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_conversations",
    )
    title = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Titre de la conversation (auto-généré depuis le 1er message si vide).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["owner", "-updated_at"]),
        ]
        verbose_name = "Conversation Assistant"
        verbose_name_plural = "Conversations Assistant"

    def __str__(self):
        return f"Conversation #{self.id} - {self.owner.email} - {self.title or '(sans titre)'}"


class ChatMessage(models.Model):
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(
        max_length=20,
        choices=ChatRole.choices,
    )
    content = models.TextField(
        help_text="Contenu du message (texte uniquement pour le chatbot)."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["conversation", "created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]
        verbose_name = "Message Assistant"
        verbose_name_plural = "Messages Assistant"

    def __str__(self):
        snippet = (self.content[:50] + "...") if len(self.content) > 50 else self.content
        return f"[{self.role}] {snippet}"
