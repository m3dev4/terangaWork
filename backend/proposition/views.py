import time
import jwt
from decouple import config
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from User.models import UserRole
from freelance.models import Freelancee
from mission.models import MissionStatus
from paiement.models import NumeroPaiement
from paiement.serializer import NumeroPaiementSerializer

from .models import ProjectMeeting, Proposition, PropositionStatus
from .serializer import ProjectMeetingSerializer, PropositionSerializer


class IsFreelance(BasePermission):
    """Réserve la création d'une proposition au profil freelance."""

    message = "Seul un freelance peut proposer sur une mission."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == UserRole.FREELANCE


class PropositionViewSet(viewsets.ModelViewSet):
    """Permet à un freelance de proposer sur une mission, avec validation métier."""

    serializer_class = PropositionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsFreelance()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Proposition.objects.select_related(
            "freelance", "mission", "freelance__user", "mission__annonceur__user"
        )
        if self.request.user.role == UserRole.FREELANCE:
            queryset = queryset.filter(freelance__user=self.request.user)
            mission_id = self.request.query_params.get("mission")
            if mission_id:
                queryset = queryset.filter(mission_id=mission_id)
            return queryset
        if self.request.user.role == UserRole.ANNONCEUR:
            return queryset.filter(mission__annonceur__user=self.request.user)
        return Proposition.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.FREELANCE:
            raise PermissionDenied(
                "Seul un freelance peut créer une proposition pour une mission."
            )

        freelance = Freelancee.objects.filter(user=self.request.user).first()
        if freelance is None:
            raise PermissionDenied(
                "Vous devez créer votre profil freelance avant de pouvoir postuler."
            )

        try:
            serializer.save(freelance=freelance)
        except IntegrityError:
            raise PermissionDenied(
                "Vous avez déjà déposé une proposition pour cette mission."
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.proposition_status == PropositionStatus.ACCEPTED:
            mission = instance.mission
            # Passer la mission en IN_PROGRESS
            mission.status = MissionStatus.IN_PROGRESS
            mission.save()
            
            # Notifier le freelance que sa proposition est acceptée
            from notification.services import notifier_proposition_acceptee, notifier_proposition_rejetee, notifier_mission_demarree
            notifier_proposition_acceptee(instance)
            
            # Notifier aussi le freelance du démarrage de la mission
            notifier_mission_demarree(mission, instance.freelancee.user)
            
            # Rejeter automatiquement toutes les autres propositions en attente
            rejected_propositions = Proposition.objects.filter(
                mission=mission,
                proposition_status=PropositionStatus.PENDING,
            ).exclude(pk=instance.pk)
            
            # Notifier chaque freelance rejeté
            for prop in rejected_propositions:
                notifier_proposition_rejetee(prop)
            
            rejected_propositions.update(
                proposition_status=PropositionStatus.REJECTED
            )

    @action(detail=True, methods=["post"], url_path="confirmer-numero-paiement")
    def confirmer_numero_paiement(self, request, pk=None):
        """
        POST /api/propositions/<id>/confirmer-numero-paiement/
        Réservé au freelance assigné, uniquement si la proposition est acceptée.
        """
        proposition = self.get_object()
        user = request.user

        if proposition.freelance.user != user:
            return Response(
                {"error": "Seul le freelance concerné par cette proposition peut confirmer le numéro de paiement."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if proposition.proposition_status != PropositionStatus.ACCEPTED:
            return Response(
                {"error": "Le numéro de paiement ne peut être confirmé que pour une proposition acceptée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        operateur = proposition.mission.operateurMobileMoney
        freelance = proposition.freelance

        existing_numero = NumeroPaiement.objects.filter(
            freelance=freelance, operateur=operateur
        ).first()

        new_numero = str(request.data.get("numero") or "").strip()

        if existing_numero:
            if new_numero:
                existing_numero.numero = new_numero
            existing_numero.save()
            num_obj = existing_numero
        else:
            if not new_numero:
                return Response(
                    {"error": f"Le numéro de paiement est obligatoire pour l'opérateur {operateur}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            num_obj = NumeroPaiement.objects.create(
                freelance=freelance,
                operateur=operateur,
                numero=new_numero,
            )

        return Response(
            {
                "message": "Numéro de paiement confirmé avec succès.",
                "numero_paiement": NumeroPaiementSerializer(num_obj).data,
            },
            status=status.HTTP_200_OK,
        )


def generate_livekit_token(room_name: str, identity: str, name: str = ""):
    api_key = config("LIVEKIT_API_KEY", default="")
    api_secret = config("LIVEKIT_API_SECRET", default="")
    livekit_url = config("LIVEKIT_URL", default="wss://jokko-r5p3aqzp.livekit.cloud")

    if not api_key or not api_secret:
        return None, livekit_url

    now = int(time.time())
    payload = {
        "iss": api_key,
        "sub": identity,
        "nbf": now - 5,
        "exp": now + (24 * 3600),
        "identity": identity,
        "name": name,
        "video": {
            "roomJoin": True,
            "room": room_name,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        },
    }

    token = jwt.encode(payload, api_secret, algorithm="HS256")
    return token, livekit_url


class ProjectMeetingViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ProjectMeeting.objects.select_related("mission", "created_by")

        mission_id = self.request.query_params.get("mission")
        if mission_id:
            queryset = queryset.filter(mission_id=mission_id)

        if user.role == UserRole.FREELANCE:
            return queryset.filter(
                mission__propositions__freelance__user=user,
                mission__propositions__proposition_status=PropositionStatus.ACCEPTED,
            ).distinct()
        elif user.role == UserRole.ANNONCEUR:
            return queryset.filter(mission__annonceur__user=user).distinct()

        return queryset

    @action(detail=True, methods=["get"])
    def token(self, request, pk=None):
        meeting = self.get_object()
        user = request.user
        identity = str(user.id)
        name = f"{user.first_name} {user.last_name}".strip() or user.username

        token, url = generate_livekit_token(
            meeting.room_name, identity=identity, name=name
        )
        return Response(
            {
                "token": token,
                "url": url,
                "room_name": meeting.room_name,
                "title": meeting.title,
            }
        )
