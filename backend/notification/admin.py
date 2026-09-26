from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Interface d'administration pour les notifications"""
    
    list_display = [
        'id',
        'type_badge',
        'utilisateur',
        'titre',
        'lue_status',
        'date_creation',
        'mission_link',
    ]
    
    list_filter = [
        'type',
        'lue',
        'date_creation',
    ]
    
    search_fields = [
        'utilisateur__username',
        'utilisateur__email',
        'titre',
        'message',
        'mission__titre',
    ]
    
    readonly_fields = [
        'id',
        'utilisateur',
        'type',
        'titre',
        'message',
        'date_creation',
        'date_lecture',
        'mission',
        'proposition',
        'paiement',
        'message_obj',
    ]
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'utilisateur', 'type', 'lue')
        }),
        ('Contenu', {
            'fields': ('titre', 'message')
        }),
        ('Objets liés', {
            'fields': ('mission', 'proposition', 'paiement', 'message_obj'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('date_creation', 'date_lecture')
        }),
    )
    
    date_hierarchy = 'date_creation'
    
    actions = ['marquer_comme_lues', 'marquer_comme_non_lues']
    
    def type_badge(self, obj):
        """Badge coloré selon le type de notification"""
        colors = {
            'PROPOSITION_ACCEPTEE': '#28a745',
            'PROPOSITION_REJETEE': '#dc3545',
            'MISSION_DEMARREE': '#17a2b8',
            'MISSION_LIVREE': '#ffc107',
            'MISSION_COMPLETEE': '#28a745',
            'MISSION_ANNULEE': '#6c757d',
            'MISSION_LITIGE': '#dc3545',
            'PAIEMENT_REUSSI': '#28a745',
            'PAIEMENT_ECHOUE': '#dc3545',
            'NOUVEAU_MESSAGE': '#007bff',
        }
        color = colors.get(obj.type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_type_display()
        )
    type_badge.short_description = 'Type'
    
    def lue_status(self, obj):
        """Affichage visuel du statut de lecture"""
        if obj.lue:
            return format_html(
                '<span style="color: #28a745;">✓ Lue</span>'
            )
        return format_html(
            '<span style="color: #dc3545; font-weight: bold;">✗ Non lue</span>'
        )
    lue_status.short_description = 'Statut'
    
    def mission_link(self, obj):
        """Lien vers la mission associée"""
        if obj.mission:
            return format_html(
                '<a href="/admin/mission/mission/{}/change/">{}</a>',
                obj.mission.id,
                obj.mission.titre[:30]
            )
        return '-'
    mission_link.short_description = 'Mission'
    
    def marquer_comme_lues(self, request, queryset):
        """Action pour marquer les notifications sélectionnées comme lues"""
        count = 0
        for notification in queryset.filter(lue=False):
            notification.marquer_comme_lue()
            count += 1
        self.message_user(request, f'{count} notification(s) marquée(s) comme lue(s).')
    marquer_comme_lues.short_description = 'Marquer comme lues'
    
    def marquer_comme_non_lues(self, request, queryset):
        """Action pour marquer les notifications sélectionnées comme non lues"""
        count = queryset.filter(lue=True).update(lue=False, date_lecture=None)
        self.message_user(request, f'{count} notification(s) marquée(s) comme non lue(s).')
    marquer_comme_non_lues.short_description = 'Marquer comme non lues'
    
    def has_add_permission(self, request):
        """Désactiver la création manuelle de notifications depuis l'admin"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Permettre uniquement la modification du champ 'lue'"""
        return True
    
    def get_readonly_fields(self, request, obj=None):
        """Tous les champs sont en lecture seule sauf 'lue'"""
        if obj:  # Modification d'une notification existante
            return [f for f in self.readonly_fields if f != 'lue']
        return self.readonly_fields
