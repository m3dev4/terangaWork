from rest_framework import serializers
from .models import NumeroPaiement, Paiement


class NumeroPaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = NumeroPaiement
        fields = [
            "id",
            "freelance",
            "operateur",
            "numero",
            "date_confirmation",
        ]
        read_only_fields = ["id", "freelance", "date_confirmation"]


class PaiementSerializer(serializers.ModelSerializer):
    mission_id = serializers.ReadOnlyField(source="proposition.mission.id")
    mission_title = serializers.ReadOnlyField(source="proposition.mission.title")
    freelance_nom = serializers.SerializerMethodField()
    annonceur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = [
            "id",
            "proposition",
            "mission_id",
            "mission_title",
            "freelance_nom",
            "annonceur_nom",
            "montant_brut",
            "taux_commission",
            "montant_commission",
            "montant_net",
            "statut_collecte",
            "statut_decaissement",
            "reference_collecte",
            "reference_decaissement",
            "date_collecte",
            "date_decaissement",
            "created_at",
            "updated_at",
        ]

    def get_freelance_nom(self, obj):
        user = obj.proposition.freelance.user
        return f"{user.first_name} {user.last_name}".strip()

    def get_annonceur_nom(self, obj):
        user = obj.proposition.mission.annonceur.user
        return f"{user.first_name} {user.last_name}".strip()
