import os

from rest_framework import serializers

from .models import CommentaireLivrable, DemandeAnnulation, Historique, Livrable, Phase


class CommentaireLivrableSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = CommentaireLivrable
        fields = ["id", "type", "texte", "fichier_vocal", "auteur", "auteur_nom", "date_creation"]
        read_only_fields = fields

    def get_auteur_nom(self, obj):
        if obj.auteur is None:
            return "Compte supprimé"
        return f"{obj.auteur.first_name} {obj.auteur.last_name}".strip()


class LivrableSerializer(serializers.ModelSerializer):
    commentaires = CommentaireLivrableSerializer(many=True, read_only=True)
    phase_type = serializers.CharField(source="phase.type", read_only=True)

    class Meta:
        model = Livrable
        fields = [
            "id",
            "phase",
            "phase_type",
            "titre",
            "lien",
            "description",
            "statut",
            "date_soumission",
            "date_decision",
            "commentaires",
        ]
        read_only_fields = [
            "id",
            "phase",
            "phase_type",
            "statut",
            "date_soumission",
            "date_decision",
            "commentaires",
        ]


class PhaseSerializer(serializers.ModelSerializer):
    livrables = LivrableSerializer(many=True, read_only=True)

    class Meta:
        model = Phase
        fields = ["id", "type", "statut", "date_ouverture", "date_limite", "livrables"]
        read_only_fields = fields


class DecisionLivrableSerializer(serializers.Serializer):
    """Commentaire de l'annonceur : texte et/ou message vocal."""

    EXTENSIONS_AUDIO = {".webm", ".ogg", ".mp3", ".m4a", ".wav", ".aac"}
    TAILLE_MAX = 5 * 1024 * 1024  # 5 Mo, environ 5 minutes de vocal

    texte = serializers.CharField(required=False, allow_blank=True, max_length=3000)
    fichier_vocal = serializers.FileField(required=False, allow_null=True)

    def validate_fichier_vocal(self, fichier):
        if fichier is None:
            return fichier
        ext = os.path.splitext(fichier.name)[1].lower()
        type_mime = (getattr(fichier, "content_type", "") or "").split(";")[0].strip()
        if ext not in self.EXTENSIONS_AUDIO or not type_mime.startswith("audio/"):
            raise serializers.ValidationError(
                "Le message vocal doit être un fichier audio (webm, ogg, mp3, m4a, wav, aac)."
            )
        if fichier.size > self.TAILLE_MAX:
            raise serializers.ValidationError("Le message vocal ne doit pas dépasser 5 Mo.")
        return fichier


class RepousserDeadlineSerializer(serializers.Serializer):
    date_limite = serializers.DateField()


class RelanceSerializer(serializers.Serializer):
    destinataire = serializers.ChoiceField(choices=["freelance", "annonceur"])
    message = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class DecisionAnnulationSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["accepter", "refuser"])


class HistoriqueSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()
    action_libelle = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = Historique
        fields = ["id", "action", "action_libelle", "details", "auteur", "auteur_nom", "date_action"]
        read_only_fields = fields

    def get_auteur_nom(self, obj):
        if obj.auteur is None:
            return "Système"
        return f"{obj.auteur.first_name} {obj.auteur.last_name}".strip()


class DemandeAnnulationSerializer(serializers.ModelSerializer):
    mission_titre = serializers.CharField(source="mission.title", read_only=True)

    class Meta:
        model = DemandeAnnulation
        fields = [
            "id",
            "mission",
            "mission_titre",
            "statut",
            "date_demande",
            "decide_par",
            "date_decision",
        ]
        read_only_fields = fields
