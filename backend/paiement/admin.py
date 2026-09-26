from django.contrib import admin
from .models import Paiement, NumeroPaiement


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reference_collecte",
        "reference_decaissement",
        "montant_brut",
        "montant_commission",
        "montant_net",
        "statut_collecte",
        "statut_decaissement",
        "proposition",
    )
    list_filter = (
        "statut_collecte",
        "statut_decaissement",
        "proposition__mission__status",
    )


@admin.register(NumeroPaiement)
class NumeroPaiementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "freelance",
        "operateur",
        "numero",
        "date_confirmation",
    )
    list_filter = ("operateur", "freelance")

