from django.db import models


class ResultatMatching(models.Model):
    """
    Persistance des résultats de matching calculés par le microservice FastAPI.
    """

    mission = models.ForeignKey(
        "mission.Mission",
        related_name="resultats_matching",
        on_delete=models.CASCADE,
    )
    freelance = models.ForeignKey(
        "freelance.Freelancee",
        related_name="resultats_matching",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    proposition = models.ForeignKey(
        "proposition.Proposition",
        related_name="resultats_matching",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    score = models.FloatField()
    score_technologies = models.FloatField()
    score_service = models.FloatField()
    score_experience = models.FloatField(null=True, blank=True)
    justification_ia = models.TextField(null=True, blank=True)
    date_calcul = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_calcul", "-score"]
        verbose_name = "Résultat de matching"
        verbose_name_plural = "Résultats de matching"

    def __str__(self):
        return f"Matching Mission #{self.mission_id} - Score: {self.score}"
