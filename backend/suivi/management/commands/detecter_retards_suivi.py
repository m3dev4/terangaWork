"""
Détection des retards du suivi de mission.

À lancer une fois par jour (cron, tâche planifiée Docker ou workflow n8n) :
    python manage.py detecter_retards_suivi

La commande ne décide rien : elle notifie l'admin (et l'annonceur pour le
cadrage) et trace l'événement dans l'historique.
"""

from django.core.management.base import BaseCommand

from suivi.services import detecter_retards


class Command(BaseCommand):
    help = "Notifie les retards de cadrage et les livrables sans réponse."

    def handle(self, *args, **options):
        resultat = detecter_retards()
        self.stdout.write(
            self.style.SUCCESS(
                f"Retards de cadrage notifiés : {resultat['retards_cadrage']} | "
                f"Livrables sans réponse notifiés : {resultat['retards_validation']}"
            )
        )
