from django.db import models
from mission.models import OperateurMobileMoneyType


class StatutCollecte(models.TextChoices):
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    REUSSI = "REUSSI", "Réussi"
    ECHOUE = "ECHOUE", "Échoué"


class StatutDecaissement(models.TextChoices):
    NON_DECLENCHE = "NON_DECLENCHE", "Non déclenché"
    EN_ATTENTE = "EN_ATTENTE", "En attente"
    REUSSI = "REUSSI", "Réussi"
    ECHOUE = "ECHOUE", "Échoué"


class NumeroPaiement(models.Model):
    freelance = models.ForeignKey(
        "freelance.Freelancee",
        on_delete=models.PROTECT,
        related_name="numeros_paiement",
    )
    operateur = models.CharField(
        max_length=50,
        choices=OperateurMobileMoneyType.choices,
    )
    numero = models.CharField(max_length=20)
    date_confirmation = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("freelance", "operateur")

    def __str__(self):
        return f"{self.freelance} - {self.operateur}: {self.numero}"


class Paiement(models.Model):
    proposition = models.OneToOneField(
        "proposition.Proposition",
        on_delete=models.CASCADE,
        related_name="paiement",
    )
    montant_brut = models.DecimalField(max_digits=12, decimal_places=2)
    taux_commission = models.DecimalField(max_digits=5, decimal_places=4)
    montant_commission = models.DecimalField(max_digits=12, decimal_places=2)
    montant_net = models.DecimalField(max_digits=12, decimal_places=2)

    statut_collecte = models.CharField(
        max_length=20,
        choices=StatutCollecte.choices,
        default=StatutCollecte.EN_ATTENTE,
    )
    statut_decaissement = models.CharField(
        max_length=20,
        choices=StatutDecaissement.choices,
        default=StatutDecaissement.NON_DECLENCHE,
    )

    reference_collecte = models.CharField(max_length=255, null=True, blank=True)
    reference_decaissement = models.CharField(max_length=255, null=True, blank=True)

    date_collecte = models.DateTimeField(null=True, blank=True)
    date_decaissement = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"Paiement #{self.pk} (Prop #{self.proposition_id}) - "
            f"Collecte: {self.statut_collecte}, Decaissement: {self.statut_decaissement}"
        )
