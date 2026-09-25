from random import choices
from django.db import models


class OperateurMobileMoneyType(models.TextChoices):
    OM = ("OM", "Orange Money")
    WAVE = ("WAVE", "Wave")


class MissionStatus(models.TextChoices):
    PENDING_MODERATION = ("PENDING_MODERATION", "En attente de modération")
    OPEN = ("OPEN", "Ouverte")
    IN_PROGRESS = ("IN_PROGRESS", "En cours de développement")
    DELIVERED = ("DELIVERED", "Livrée")
    COMPLETED = ("COMPLETED", "Terminée")
    CLOSED = ("CLOSED", "Fermée")
    REJECTED = ("REJECTED", "Rejetée")


class Mission(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=1000)
    date_deadline = models.DateField(null=True, blank=True)
    operateurMobileMoney = models.CharField(max_length=50, choices=OperateurMobileMoneyType.choices)
    budget = models.IntegerField()
    service = models.ForeignKey("Service.Service", on_delete=models.CASCADE)
    technologies = models.ManyToManyField(
        "Technologie.Technologie",
        blank=True,
        related_name="missions",
    )
    annonceur = models.ForeignKey("announcer.Announcer", on_delete=models.CASCADE)
    status = models.CharField(
        max_length=30,
        choices=MissionStatus.choices,
        default=MissionStatus.PENDING_MODERATION,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.description} - {self.budget} - {self.service} - {self.annonceur}"

