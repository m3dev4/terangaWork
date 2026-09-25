import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Mission, MissionStatus

logger = logging.getLogger(__name__)


class MissionModerationView(APIView):
    """
    PATCH /api/missions/<mission_id>/moderation/
    (Aussi compatible POST)

    Décision de modération transmise par n8n ou l'administrateur :
    - { "decision": "approuver" } => mission.status devient OPEN (publiée pour les freelances)
    - { "decision": "supprimer" } => la mission est SUPPRIMÉE définitivement de la base de données
    """

    permission_classes = [AllowAny]

    def patch(self, request, mission_id: int):
        return self._process_moderation(request, mission_id)

    def post(self, request, mission_id: int):
        return self._process_moderation(request, mission_id)

    def _process_moderation(self, request, mission_id: int):
        mission = Mission.objects.filter(pk=mission_id).first()
        if not mission:
            return Response(
                {"detail": f"Mission #{mission_id} non trouvée ou déjà supprimée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        raw_decision = request.data.get("decision") or request.query_params.get("decision", "")
        decision = str(raw_decision).strip().lower()

        if decision in ["approuver", "approve", "approuvee", "accepted", "published", "valider"]:
            mission.status = MissionStatus.OPEN
            mission.save(update_fields=["status", "updated_at"])
            logger.info(f"Mission #{mission.id} approuvée et publiée avec succès.")
            return Response(
                {
                    "detail": "Mission approuvée et publiée avec succès.",
                    "status": MissionStatus.OPEN,
                    "mission_id": mission.id,
                },
                status=status.HTTP_200_OK,
            )
        elif decision in ["supprimer", "delete", "reject", "rejetter", "refuser"]:
            mission_id_saved = mission.id
            mission.delete()
            logger.info(f"Mission #{mission_id_saved} supprimée automatiquement de la BD.")
            return Response(
                {
                    "detail": "Mission refusée et supprimée définitivement.",
                    "status": "DELETED",
                    "mission_id": mission_id_saved,
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "detail": "Décision invalide. Attendu: 'approuver' ou 'supprimer'.",
                    "received": decision,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
