from django.core.exceptions import ValidationError
from django.db import models


class PropositionStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    ACCEPTED = "ACCEPTED", "Acceptée"
    REJECTED = "REJECTED", "Refusée"


class Proposition(models.Model):
    lettre_motivation = models.TextField(max_length=5000)
    date_livraison = models.DateField()
    currentDate = models.BooleanField(default=False)
    freelance = models.ForeignKey(
        "freelance.Freelancee",
        related_name="propositions",
        on_delete=models.CASCADE,
    )
    mission = models.ForeignKey(
        "mission.Mission",
        related_name="propositions",
        on_delete=models.CASCADE,
    )
    proposition_status = models.CharField(
        max_length=20,
        choices=PropositionStatus.choices,
        default=PropositionStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["freelance", "mission"],
                name="unique_proposition_per_freelance_and_mission",
            )
        ]

    def clean(self):
        super().clean()

        if self.currentDate and self.mission_id:
            if not self.mission.date_deadline:
                raise ValidationError({"currentDate": "Cette mission n'a pas de date limite à conserver."})
            self.date_livraison = self.mission.date_deadline

        if self.mission and self.mission.date_deadline and self.date_livraison:
            if self.date_livraison > self.mission.date_deadline:
                raise ValidationError(
                    {
                        "date_livraison": "La date de livraison proposée ne peut pas dépasser la deadline de la mission."
                    }
                )

    def __str__(self):
        return (
            f"{self.freelance.user.first_name} {self.freelance.user.last_name} - "
            f"{self.mission.title}"
        )


class ProjectMeeting(models.Model):
    mission = models.ForeignKey(
        "mission.Mission",
        related_name="meetings",
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=200)
    date = models.DateField()
    time = models.TimeField()
    room_name = models.CharField(max_length=255, blank=True)
    link = models.URLField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        "User.User",
        on_delete=models.CASCADE,
        related_name="created_meetings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time"]

    def __str__(self):
        return f"{self.title} - {self.mission.title} ({self.date} {self.time})"
