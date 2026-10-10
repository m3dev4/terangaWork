from django.contrib import admin

from .models import CommentaireLivrable, DemandeAnnulation, Historique, Livrable, Phase


class LivrableInline(admin.TabularInline):
    model = Livrable
    extra = 0
    readonly_fields = ["titre", "lien", "statut", "date_soumission", "date_decision"]


@admin.register(Phase)
class PhaseAdmin(admin.ModelAdmin):
    list_display = ["mission", "type", "statut", "date_limite", "retard_notifie"]
    list_filter = ["type", "statut"]
    inlines = [LivrableInline]


@admin.register(Livrable)
class LivrableAdmin(admin.ModelAdmin):
    list_display = ["titre", "phase", "statut", "date_soumission"]
    list_filter = ["statut"]


@admin.register(CommentaireLivrable)
class CommentaireLivrableAdmin(admin.ModelAdmin):
    list_display = ["livrable", "type", "auteur", "date_creation"]


@admin.register(Historique)
class HistoriqueAdmin(admin.ModelAdmin):
    list_display = ["mission", "action", "auteur", "date_action"]
    list_filter = ["action"]
    readonly_fields = ["mission", "action", "auteur", "details", "date_action"]


@admin.register(DemandeAnnulation)
class DemandeAnnulationAdmin(admin.ModelAdmin):
    list_display = ["mission", "statut", "date_demande", "decide_par"]
    list_filter = ["statut"]
