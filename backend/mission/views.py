import logging
import threading
import requests
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from User.models import UserRole
from announcer.models import Announcer
from proposition.models import PropositionStatus
from paiement.serializer import PaiementSerializer
from paiement.services import (
    DuplicatePaymentError,
    InvalidMissionStatusError,
    PayDunyaError,
    initiate_collection,
)

from .models import Mission, MissionStatus
from .serializer import MissionSerializer

logger = logging.getLogger(__name__)


def send_n8n_moderation_webhook(mission: Mission):
    """
    Envoie les informations de la mission créée au Webhook n8n Cloud pour modération.
    """
    webhook_url = getattr(
        settings,
        "N8N_MODERATION_WEBHOOK_URL",
        "https://m3dev4.app.n8n.cloud/webhook-test/terangawork/moderation",
    )
    if not webhook_url:
        return

    payload = {
        "mission_id": mission.id,
        "titre": mission.title,
        "description": mission.description,
    }

    def _call_webhook():
        try:
            resp = requests.post(webhook_url, json=payload, timeout=15)
            logger.info(
                f"Webhook n8n modération appelé pour mission #{mission.id} - Statut HTTP {resp.status_code}"
            )
        except Exception as e:
            logger.error(
                f"Erreur lors de l'appel du webhook n8n modération pour mission #{mission.id}: {e}"
            )

    threading.Thread(target=_call_webhook, daemon=True).start()


class IsAnnonceur(BasePermission):
    """Réserve les mutations de missions aux annonceurs."""

    message = "Seul un annonceur peut gérer une mission."

    def has_permission(self, request, view):
        return request.user.role == UserRole.ANNONCEUR


class MissionViewSet(viewsets.ModelViewSet):
    """Permet à un annonceur de gérer ses missions avec flux de modération n8n."""

    serializer_class = MissionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAnnonceur()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Mission.objects.select_related("service", "annonceur").prefetch_related("technologies")
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.filter(status=MissionStatus.OPEN)
        if user.is_staff or getattr(user, "is_superuser", False) or getattr(user, "role", None) == "admin":
            return queryset
        if getattr(user, "role", None) == UserRole.ANNONCEUR or hasattr(user, "announcer"):
            return queryset.filter(annonceur__user=user)
        return queryset.filter(status=MissionStatus.OPEN)

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ANNONCEUR:
            raise PermissionDenied(
                "Seul un utilisateur ayant le rôle annonceur peut créer une mission."
            )
        annonceur = Announcer.objects.filter(user=self.request.user).first()
        if annonceur is None:
            raise PermissionDenied(
                "Vous devez créer votre profil annonceur auparavant."
            )
        mission = serializer.save(
            annonceur=annonceur,
            status=MissionStatus.PENDING_MODERATION,
        )
        send_n8n_moderation_webhook(mission)

    @action(detail=True, methods=["post"], url_path="marquer-livree")
    def marquer_livree(self, request, pk=None):
        """
        POST /api/missions/<id>/marquer-livree/
        Réservé au freelance assigné à la mission.
        Passe le statut de IN_PROGRESS à DELIVERED.
        """
        mission = self.get_object()
        user = request.user

        accepted_prop = mission.propositions.filter(
            proposition_status=PropositionStatus.ACCEPTED
        ).first()

        if not accepted_prop or accepted_prop.freelance.user != user:
            return Response(
                {"error": "Seul le freelance assigné à cette mission peut la marquer comme livrée."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if mission.status != MissionStatus.IN_PROGRESS:
            return Response(
                {
                    "error": f"Impossible de marquer livrée une mission avec le statut actuel: {mission.status}. Statut requis: IN_PROGRESS."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        mission.status = MissionStatus.DELIVERED
        mission.save()
        
        # Notifier l'annonceur que la mission a été livrée
        from notification.services import notifier_mission_livree
        notifier_mission_livree(mission, mission.annonceur.user)

        return Response(
            {
                "message": "Mission marquée comme livrée avec succès.",
                "status": mission.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="valider-livraison")
    def valider_livraison(self, request, pk=None):
        """
        POST /api/missions/<id>/valider-livraison/
        Réservé à l'annonceur propriétaire.
        Passe le statut de DELIVERED à COMPLETED.
        """
        mission = self.get_object()
        user = request.user

        if mission.annonceur.user != user:
            return Response(
                {"error": "Seul l'annonceur propriétaire de la mission peut valider la livraison."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if mission.status != MissionStatus.DELIVERED:
            return Response(
                {
                    "error": f"La livraison ne peut être validée que si le statut est DELIVERED (statut actuel: {mission.status})."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        mission.status = MissionStatus.COMPLETED
        mission.save()
        
        # Notifier l'annonceur et le freelance que la mission est complétée
        from notification.services import notifier_mission_completee
        accepted_prop = mission.propositions.filter(
            proposition_status=PropositionStatus.ACCEPTED
        ).first()
        
        notifier_mission_completee(mission, mission.annonceur.user)
        if accepted_prop:
            notifier_mission_completee(mission, accepted_prop.freelance.user)

        return Response(
            {
                "message": "Livraison validée avec succès. La mission est désormais terminée.",
                "status": mission.status,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="payer")
    def payer(self, request, pk=None):
        """
        POST /api/missions/<id>/payer/
        Réservé à l'annonceur propriétaire.
        Vérifie strict Mission.status == COMPLETED.
        """
        mission = self.get_object()
        user = request.user

        if mission.annonceur.user != user:
            return Response(
                {"error": "Seul l'annonceur propriétaire de la mission peut initier le paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if mission.status != MissionStatus.COMPLETED:
            return Response(
                {
                    "error": f"Le paiement n'est déclenchable que si la mission est terminée (statut actuel: {mission.status})."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            res = initiate_collection(mission, user)
            paiement_data = PaiementSerializer(res["paiement"]).data
            return Response(
                {
                    "message": "Paiement initialisé avec succès.",
                    "token": res["token"],
                    "payment_url": res["payment_url"],
                    "paiement": paiement_data,
                },
                status=status.HTTP_200_OK,
            )
        except DuplicatePaymentError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_409_CONFLICT,
            )
        except (InvalidMissionStatusError, PayDunyaError) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="historique-paiement")
    def historique_paiement(self, request, pk=None):
        """
        GET /api/missions/<id>/historique-paiement/
        Accessible uniquement à l'Annonceur et au Freelance concernés.
        Expose les deux statuts, références, dates et montants.
        """
        mission = self.get_object()
        user = request.user

        accepted_prop = mission.propositions.filter(
            proposition_status=PropositionStatus.ACCEPTED
        ).first()

        is_annonceur = mission.annonceur.user == user
        is_freelance = accepted_prop and accepted_prop.freelance.user == user

        if not (is_annonceur or is_freelance):
            return Response(
                {"error": "Accès non autorisé à l'historique de paiement de cette mission."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not accepted_prop or not hasattr(accepted_prop, "paiement"):
            return Response(
                {"detail": "Aucun paiement enregistré pour cette mission."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PaiementSerializer(accepted_prop.paiement)
        return Response(serializer.data, status=status.HTTP_200_OK)
