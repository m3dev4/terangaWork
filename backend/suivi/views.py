from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from mission.models import Mission

from . import services
from .models import DemandeAnnulation, Livrable, StatutDemandeAnnulation
from .serializers import (
    DecisionAnnulationSerializer,
    DecisionLivrableSerializer,
    DemandeAnnulationSerializer,
    HistoriqueSerializer,
    LivrableSerializer,
    PhaseSerializer,
    RelanceSerializer,
    RepousserDeadlineSerializer,
)


def _executer(fonction, *args, **kwargs):
    """Traduit les erreurs métier en réponses HTTP."""
    try:
        return fonction(*args, **kwargs), None
    except PermissionError as e:
        return None, Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except services.SuiviError as e:
        return None, Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _mission_accessible(request, mission_id):
    """Annonceur, freelance assigné ou admin. Renvoie (mission, réponse d'erreur)."""
    mission = get_object_or_404(
        Mission.objects.select_related("annonceur__user"), pk=mission_id
    )
    user = request.user
    if (
        services.est_admin(user)
        or services.est_annonceur_de(user, mission)
        or services.est_freelance_de(user, mission)
    ):
        return mission, None
    return None, Response(
        {"error": "Vous ne participez pas à cette mission."},
        status=status.HTTP_403_FORBIDDEN,
    )


class SuiviMissionView(APIView):
    """GET /api/suivi/missions/<id>/ : phases, livrables et commentaires."""

    permission_classes = [IsAuthenticated]

    def get(self, request, mission_id):
        mission, erreur = _mission_accessible(request, mission_id)
        if erreur:
            return erreur
        phases = mission.phases.prefetch_related(
            "livrables__commentaires__auteur"
        ).order_by("date_ouverture")
        demande = mission.demandes_annulation.filter(
            statut=StatutDemandeAnnulation.EN_ATTENTE
        ).first()
        return Response(
            {
                "mission": mission.id,
                "mission_statut": mission.status,
                "phases": PhaseSerializer(
                    phases, many=True, context={"request": request}
                ).data,
                "demande_annulation_en_attente": (
                    DemandeAnnulationSerializer(demande).data if demande else None
                ),
            }
        )


class SoumettreLivrableView(APIView):
    """POST /api/suivi/missions/<id>/livrables/ : { titre, lien, description? }"""

    permission_classes = [IsAuthenticated]

    def post(self, request, mission_id):
        mission = get_object_or_404(Mission, pk=mission_id)
        serializer = LivrableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        livrable, erreur = _executer(
            services.soumettre_livrable,
            mission,
            request.user,
            **serializer.validated_data
        )
        if erreur:
            return erreur
        return Response(
            LivrableSerializer(livrable).data, status=status.HTTP_201_CREATED
        )


class _DecisionLivrableView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    action_service = None

    def post(self, request, livrable_id):
        livrable = get_object_or_404(Livrable, pk=livrable_id)
        serializer = DecisionLivrableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resultat, erreur = _executer(
            type(self).action_service,
            livrable,
            request.user,
            texte=serializer.validated_data.get("texte", ""),
            fichier_vocal=serializer.validated_data.get("fichier_vocal"),
        )
        if erreur:
            return erreur
        resultat.refresh_from_db()
        return Response(LivrableSerializer(resultat, context={"request": request}).data)


class ValiderLivrableView(_DecisionLivrableView):
    """POST /api/suivi/livrables/<id>/valider/ : commentaire facultatif (texte ou fichier_vocal)."""

    action_service = staticmethod(services.valider_livrable)


class InvaliderLivrableView(_DecisionLivrableView):
    """POST /api/suivi/livrables/<id>/invalider/ : commentaire obligatoire (texte ou fichier_vocal)."""

    action_service = staticmethod(services.invalider_livrable)


class RepousserDeadlineView(APIView):
    """POST /api/suivi/missions/<id>/repousser-deadline/ : { date_limite } (annonceur)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, mission_id):
        mission = get_object_or_404(Mission, pk=mission_id)
        serializer = RepousserDeadlineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phase, erreur = _executer(
            services.repousser_deadline_cadrage,
            mission,
            request.user,
            serializer.validated_data["date_limite"],
        )
        if erreur:
            return erreur
        return Response(PhaseSerializer(phase).data)


class RelancerView(APIView):
    """POST /api/suivi/missions/<id>/relancer/ : { destinataire, message? } (admin)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, mission_id):
        mission = get_object_or_404(Mission, pk=mission_id)
        serializer = RelanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, erreur = _executer(
            services.relancer,
            mission,
            request.user,
            serializer.validated_data["destinataire"],
            serializer.validated_data.get("message", ""),
        )
        if erreur:
            return erreur
        return Response({"message": "Relance envoyée."})


class HistoriqueMissionView(APIView):
    """GET /api/suivi/missions/<id>/historique/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, mission_id):
        mission, erreur = _mission_accessible(request, mission_id)
        if erreur:
            return erreur
        lignes = mission.historique.select_related("auteur")
        return Response(HistoriqueSerializer(lignes, many=True).data)


class DemanderAnnulationView(APIView):
    """POST /api/suivi/missions/<id>/demander-annulation/ (annonceur)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, mission_id):
        mission = get_object_or_404(Mission, pk=mission_id)
        demande, erreur = _executer(services.demander_annulation, mission, request.user)
        if erreur:
            return erreur
        return Response(
            DemandeAnnulationSerializer(demande).data, status=status.HTTP_201_CREATED
        )


class DemandesAnnulationView(APIView):
    """GET /api/suivi/demandes-annulation/?statut=EN_ATTENTE (admin)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not services.est_admin(request.user):
            return Response(
                {"error": "Réservé à l'administration."},
                status=status.HTTP_403_FORBIDDEN,
            )
        demandes = DemandeAnnulation.objects.select_related("mission")
        statut = request.query_params.get("statut")
        if statut:
            demandes = demandes.filter(statut=statut)
        return Response(DemandeAnnulationSerializer(demandes, many=True).data)


class DeciderAnnulationView(APIView):
    """POST /api/suivi/demandes-annulation/<id>/decider/ : { decision: accepter|refuser } (admin)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        demande = get_object_or_404(DemandeAnnulation, pk=demande_id)
        serializer = DecisionAnnulationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande, erreur = _executer(
            services.decider_annulation,
            demande,
            request.user,
            serializer.validated_data["decision"],
        )
        if erreur:
            return erreur
        return Response(DemandeAnnulationSerializer(demande).data)
