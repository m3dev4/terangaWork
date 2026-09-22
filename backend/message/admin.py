from django.contrib import admin
from .models import Message, MessageLu


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Interface d'administration pour les messages"""
    
    list_display = [
        'id',
        'type',
        'expediteur',
        'destinataire',
        'mission',
        'contenu_preview',
        'date_envoi',
    ]
    
    list_filter = [
        'type',
        'date_envoi',
    ]
    
    search_fields = [
        'expediteur__username',
        'expediteur__email',
        'destinataire__username',
        'destinataire__email',
        'mission__titre',
        'contenu',
    ]
    
    readonly_fields = [
        'id',
        'expediteur',
        'destinataire',
        'mission',
        'date_envoi',
    ]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'type', 'expediteur', 'destinataire', 'mission')
        }),
        ('Contenu', {
            'fields': ('contenu', 'audio_url')
        }),
        ('Métadonnées', {
            'fields': ('date_envoi',)
        }),
    )
    
    date_hierarchy = 'date_envoi'
    
    def contenu_preview(self, obj):
        """Prévisualisation du contenu du message"""
        if obj.type == 'TEXTE':
            return obj.contenu[:50] + '...' if len(obj.contenu) > 50 else obj.contenu
        return f"[Message vocal: {obj.audio_url}]"
    contenu_preview.short_description = 'Aperçu'
    
    def has_add_permission(self, request):
        """Désactiver la création manuelle de messages depuis l'admin"""
        return False


@admin.register(MessageLu)
class MessageLuAdmin(admin.ModelAdmin):
    """Interface d'administration pour le suivi de lecture des messages"""
    
    list_display = [
        'message',
        'utilisateur',
        'date_lecture',
    ]
    
    list_filter = [
        'date_lecture',
    ]
    
    search_fields = [
        'message__contenu',
        'utilisateur__username',
        'utilisateur__email',
    ]
    
    readonly_fields = [
        'message',
        'utilisateur',
        'date_lecture',
    ]
    
    date_hierarchy = 'date_lecture'
    
    def has_add_permission(self, request):
        """Désactiver la création manuelle depuis l'admin"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Lecture seule"""
        return False
