"""
Suivi de mission par phases (espace coworking).

Phase 1 : cadrage (3 à 5 jours après l'acceptation de la candidature).
Phase 2 : développement (livrables soumis par le freelance).

Règle de base (BNF7) : le système détecte, notifie et trace.
Il ne prend jamais de décision à la place de l'annonceur ou de l'admin.
"""

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


class TypePhase(models.TextChoices):
    CADRAGE = "CADRAGE", "Cadrage"
    DEVELOPPEMENT = "DEVELOPPEMENT", "Développement"


class StatutPhase(models.TextChoices):
    EN_COURS = "EN_COURS", "En cours"
    VALIDEE = "VALIDEE", "Validée"


class StatutLivrable(models.TextChoices):
    A_VALIDER = "A_VALIDER", "À valider"
    VALIDE = "VALIDE", "Validé"
    INVALIDE = "INVALIDE", "Invalidé"


class TypeCommentaire(models.TextChoices):
    TEXTE = "TEXTE", "Texte"
    VOCAL = "VOCAL", "Vocal"


class StatutDemandeAnnulation(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    ACCEPTEE = "ACCEPTEE", "Acceptée"
    REFUSEE = "REFUSEE", "Refusée"


class ActionHistorique(models.TextChoices):
    PHASE_OUVERTE = "PHASE_OUVERTE", "Phase ouverte"
    PHASE_VALIDEE = "PHASE_VALIDEE", "Phase validée"
    LIVRABLE_SOUMIS = "LIVRABLE_SOUMIS", "Livrable soumis"
    LIVRABLE_VALIDE = "LIVRABLE_VALIDE", "Livrable validé"
    LIVRABLE_INVALIDE = "LIVRABLE_INVALIDE", "Livrable invalidé"
    DEADLINE_REPOUSSEE = "DEADLINE_REPOUSSEE", "Deadline repoussée"
    RETARD_CADRAGE = "RETARD_CADRAGE", "Retard de cadrage détecté"
    RETARD_VALIDATION = "RETARD_VALIDATION", "Retard de validation détecté"
    RELANCE = "RELANCE", "Relance envoyée"
    ANNULATION_DEMANDEE = "ANNULATION_DEMANDEE", "Annulation demandée"
    ANNULATION_ACCEPTEE = "ANNULATION_ACCEPTEE", "Annulation acceptée"
    ANNULATION_REFUSEE = "ANNULATION_REFUSEE", "Annulation refusée"


class Phase(models.Model):
    mission = models.ForeignKey(
        "mission.Mission", related_name="phases", on_delete=models.CASCADE
    )
    type = models.CharField(max_length=20, choices=TypePhase.choices)
    statut = models.CharField(
        max_length=20, choices=StatutPhase.choices, default=StatutPhase.EN_COURS
    )
    date_ouverture = models.DateTimeField(auto_now_add=True)
    date_limite = models.DateField(null=True, blank=True)
    # Évite de notifier plusieurs fois le même retard de cadrage.
    retard_notifie = models.BooleanField(default=False)

    class Meta:
        ordering = ["date_ouverture"]
        constraints = [
            models.UniqueConstraint(
                fields=["mission", "type"], name="unique_phase_par_type_et_mission"
            )
        ]

    def __str__(self):
        return f"{self.get_type_display()} - mission #{self.mission_id}"


class Livrable(models.Model):
    phase = models.ForeignKey(
        Phase, related_name="livrables", on_delete=models.CASCADE
    )
    freelance = models.ForeignKey(
        "freelance.Freelancee", related_name="livrables", on_delete=models.CASCADE
    )
    titre = models.CharField(max_length=200)
    lien = models.URLField(max_length=500)
    description = models.TextField(max_length=3000, blank=True, default="")
    statut = models.CharField(
        max_length=20, choices=StatutLivrable.choices, default=StatutLivrable.A_VALIDER
    )
    date_soumission = models.DateTimeField(auto_now_add=True)
    date_decision = models.DateTimeField(null=True, blank=True)
    # Évite d'alerter plusieurs fois l'admin pour le même livrable sans réponse.
    retard_validation_notifie = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date_soumission"]

    def __str__(self):
        return f"{self.titre} ({self.get_statut_display()})"


class CommentaireLivrable(models.Model):
    livrable = models.ForeignKey(
        Livrable, related_name="commentaires", on_delete=models.CASCADE
    )
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="commentaires_livrables",
        on_delete=models.CASCADE,
    )
    type = models.CharField(max_length=10, choices=TypeCommentaire.choices)
    texte = models.TextField(max_length=3000, blank=True, default="")
    fichier_vocal = models.FileField(
        upload_to="suivi/vocaux/",
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(["webm", "ogg", "mp3", "m4a", "wav", "aac"])
        ],
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date_creation"]

    def __str__(self):
        return f"Commentaire {self.get_type_display()} sur {self.livrable_id}"


class Historique(models.Model):
    mission = models.ForeignKey(
        "mission.Mission", related_name="historique", on_delete=models.CASCADE
    )
    # Vide quand l'action vient du système (détection de retard, ouverture de phase).
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="actions_historique",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=30, choices=ActionHistorique.choices)
    details = models.TextField(blank=True, default="")
    date_action = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_action"]

    def __str__(self):
        return f"{self.get_action_display()} - mission #{self.mission_id}"


class DemandeAnnulation(models.Model):
    mission = models.ForeignKey(
        "mission.Mission",
        related_name="demandes_annulation",
        on_delete=models.CASCADE,
    )
    annonceur = models.ForeignKey(
        "announcer.Announcer",
        related_name="demandes_annulation",
        on_delete=models.CASCADE,
    )
    statut = models.CharField(
        max_length=20,
        choices=StatutDemandeAnnulation.choices,
        default=StatutDemandeAnnulation.EN_ATTENTE,
    )
    date_demande = models.DateTimeField(auto_now_add=True)
    decide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="annulations_decidees",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    date_decision = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_demande"]

    def __str__(self):
        return f"Annulation mission #{self.mission_id} ({self.get_statut_display()})"
