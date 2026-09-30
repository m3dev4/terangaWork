"""
Vues pour le processus d'onboarding séquentiel.

Architecture : une vue générique paramétrée par step_name qui dispatche
vers le bon serializer et la bonne logique de sauvegarde.

Endpoints :
    POST   /api/onboarding/<step_name>/       — soumettre une étape
    POST   /api/onboarding/skip/<step_name>/   — sauter une étape optionnelle
    POST   /api/onboarding/back/<step_name>/   — revenir modifier une étape
    GET    /api/onboarding/status/             — état global consultable
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Type

from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from announcer.models import Announcer, TypeAnnouncer
from freelance.models import Education, Experience, Freelancee, Realisation
from Service.models import Service
from Technologie.models import Technologie
from User.models import User, UserRole

from .onboarding_serializers import (
    AnnouncerFinalisationSerializer,
    AnnouncerInfosEntrepriseSerializer,
    AnnouncerTypeSerializer,
    BackToStepSerializer,
    EducationSerializer,
    ExperienceSerializer,
    FreelanceFinalisationSerializer,
    FreelancePresentationSerializer,
    FreelanceServiceSerializer,
    FreelanceTechnologiesSerializer,
    IdentiteSerializer,
    RealisationSerializer,
    RoleSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION DES ÉTAPES
# =============================================================================

# Séquence des étapes par rôle (None = rôle pas encore choisi)
FREELANCE_STEPS: List[str] = [
    "identite",
    "role",
    "presentation",
    "service",
    "technologies",
    "experience",
    "formation",
    "realisations",
    "finalisation",
]

ANNONCEUR_STEPS: List[str] = [
    "identite",
    "role",
    "type_annonceur",
    "infos_entreprise",
    "finalisation",
]

# Étapes communes avant le choix du rôle
PRE_ROLE_STEPS: List[str] = ["identite", "role"]

# Étapes qui peuvent être sautées
SKIPPABLE_STEPS = {"experience", "formation", "realisations"}

# Étapes obligatoires (ne peuvent PAS être sautées)
MANDATORY_STEPS = {
    "identite",
    "role",
    "presentation",
    "service",
    "technologies",
    "type_annonceur",
    "infos_entreprise",
    "finalisation",
}

# Mapping étape → serializer
STEP_SERIALIZERS: Dict[str, Type[drf_serializers.Serializer]] = {
    "identite": IdentiteSerializer,
    "role": RoleSerializer,
    "presentation": FreelancePresentationSerializer,
    "service": FreelanceServiceSerializer,
    "technologies": FreelanceTechnologiesSerializer,
    "experience": ExperienceSerializer,
    "formation": EducationSerializer,
    "realisations": RealisationSerializer,
    "finalisation": FreelanceFinalisationSerializer,  # Sera surchargé pour annonceur
    "type_annonceur": AnnouncerTypeSerializer,
    "infos_entreprise": AnnouncerInfosEntrepriseSerializer,
}


def get_steps_for_user(user: User) -> List[str]:
    """Retourne la séquence d'étapes applicable à l'utilisateur."""
    if not user.role:
        return PRE_ROLE_STEPS
    if user.role == UserRole.FREELANCE:
        return FREELANCE_STEPS
    if user.role == UserRole.ANNONCEUR:
        # Si l'annonceur est particulier, on saute infos_entreprise
        announcer = Announcer.objects.filter(user=user).first()
        if announcer and announcer.typeAnnonceur == TypeAnnouncer.PARTICULIER:
            return [s for s in ANNONCEUR_STEPS if s != "infos_entreprise"]
        return ANNONCEUR_STEPS
    return PRE_ROLE_STEPS


def get_step_index(steps: List[str], step_name: str) -> int:
    """Retourne l'index d'une étape dans la séquence, ou -1 si introuvable."""
    try:
        return steps.index(step_name)
    except ValueError:
        return -1


def get_serializer_for_step(user: User, step_name: str) -> Type[drf_serializers.Serializer]:
    """Retourne le serializer approprié pour une étape, en tenant compte du rôle."""
    if step_name == "finalisation":
        if user.role == UserRole.ANNONCEUR:
            return AnnouncerFinalisationSerializer
        return FreelanceFinalisationSerializer
    return STEP_SERIALIZERS.get(step_name)


def get_next_step(user: User, current_step: str) -> Optional[str]:
    """Retourne l'étape suivante dans la séquence, ou None si c'est la dernière."""
    steps = get_steps_for_user(user)
    idx = get_step_index(steps, current_step)
    if idx == -1 or idx >= len(steps) - 1:
        return None
    return steps[idx + 1]


# =============================================================================
# COLLECTE DES DONNÉES COMPLÉTÉES
# =============================================================================

def _collect_completed_data(user: User, steps: List[str]) -> Dict[str, Any]:
    """
    Collecte les données saisies pour chaque étape déjà validée,
    afin de permettre au frontend de pré-remplir les formulaires.
    """
    current_idx = get_step_index(steps, user.onboarding_step)
    data: Dict[str, Any] = {}

    for i, step_name in enumerate(steps):
        # Seules les étapes avant l'étape actuelle sont considérées complétées
        if i >= current_idx and not user.onboarding_completed:
            break

        if step_name == "identite":
            data["identite"] = {
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "number_phone": user.number_phone or "",
            }

        elif step_name == "role":
            data["role"] = {"role": user.role or ""}

        elif step_name == "presentation":
            freelance = _get_freelance(user)
            if freelance:
                data["presentation"] = {
                    "title": freelance.title or "",
                    "description": freelance.description or "",
                    "githubUrl": freelance.githubUrl or "",
                    "linkedinUrl": freelance.linkedinUrl or "",
                }

        elif step_name == "service":
            freelance = _get_freelance(user)
            if freelance and freelance.service_id:
                data["service"] = {"service_id": freelance.service_id}

        elif step_name == "technologies":
            freelance = _get_freelance(user)
            if freelance:
                tech_ids = list(
                    freelance.technologies.values_list("pk", flat=True)
                )
                data["technologies"] = {"technology_ids": tech_ids}

        elif step_name == "experience":
            freelance = _get_freelance(user)
            if freelance:
                experiences = freelance.experiences.all().values(
                    "id", "entreprise", "poste", "description",
                    "startDate", "endDate", "current",
                )
                data["experience"] = list(experiences)

        elif step_name == "formation":
            freelance = _get_freelance(user)
            if freelance:
                educations = freelance.educations.all().values(
                    "id", "role", "nom", "etablissement", "intitule",
                    "date_obtention", "lien_verification",
                    "startDate", "endDate", "current", "description",
                )
                data["formation"] = list(educations)

        elif step_name == "realisations":
            freelance = _get_freelance(user)
            if freelance:
                reals = freelance.realisations.all().values(
                    "id", "title", "description", "link",
                )
                data["realisations"] = list(reals)

        elif step_name == "type_annonceur":
            announcer = _get_announcer(user)
            if announcer:
                data["type_annonceur"] = {
                    "typeAnnonceur": announcer.typeAnnonceur or "",
                }

        elif step_name == "infos_entreprise":
            announcer = _get_announcer(user)
            if announcer:
                data["infos_entreprise"] = {
                    "company_name": announcer.company_name or "",
                    "company_secteur": announcer.company_secteur or "",
                    "company_website": announcer.company_website or "",
                }

        elif step_name == "finalisation":
            if user.role == UserRole.FREELANCE:
                freelance = _get_freelance(user)
                if freelance:
                    data["finalisation"] = {
                        "githubUrl": freelance.githubUrl or "",
                        "profile_picture": (
                            user.profile_picture.url
                            if user.profile_picture
                            else None
                        ),
                    }
            elif user.role == UserRole.ANNONCEUR:
                data["finalisation"] = {
                    "profile_picture": (
                        user.profile_picture.url
                        if user.profile_picture
                        else None
                    ),
                }

    return data


def _get_freelance(user: User) -> Optional[Freelancee]:
    """Récupère le profil Freelance de l'utilisateur, ou None."""
    try:
        return user.freelance
    except Freelancee.DoesNotExist:
        return None


def _get_announcer(user: User) -> Optional[Announcer]:
    """Récupère le profil Announcer de l'utilisateur, ou None."""
    try:
        return user.announcer
    except Announcer.DoesNotExist:
        return None


# =============================================================================
# LOGIQUE DE SAUVEGARDE PAR ÉTAPE
# =============================================================================

def _save_identite(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde l'étape identité."""
    user.first_name = validated_data["first_name"]
    user.last_name = validated_data["last_name"]
    user.number_phone = validated_data["number_phone"]
    user.save(update_fields=["first_name", "last_name", "number_phone"])


def _save_role(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde le rôle et crée le profil associé."""
    role = validated_data["role"]
    user.role = role
    user.save(update_fields=["role"])

    # Créer le profil associé s'il n'existe pas
    if role == UserRole.FREELANCE:
        Freelancee.objects.get_or_create(
            user=user,
            defaults={"title": "", "description": ""},
        )
    elif role == UserRole.ANNONCEUR:
        Announcer.objects.get_or_create(
            user=user,
            defaults={
                "typeAnnonceur": "",
                "company_name": "",
                "company_secteur": "",
                "description": "",
                "company_address": "",
                "company_phone": "",
            },
        )


def _save_presentation(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde la présentation freelance."""
    freelance = _get_freelance(user)
    if not freelance:
        return
    freelance.title = validated_data["title"]
    freelance.description = validated_data["description"]
    freelance.githubUrl = validated_data.get("githubUrl", "")
    freelance.linkedinUrl = validated_data.get("linkedinUrl", "")
    freelance.save(update_fields=["title", "description", "githubUrl", "linkedinUrl"])


def _save_service(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde le service choisi."""
    freelance = _get_freelance(user)
    if not freelance:
        return
    service = Service.objects.get(pk=validated_data["service_id"])
    freelance.service = service
    freelance.save(update_fields=["service"])


def _save_technologies(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde les technologies choisies."""
    freelance = _get_freelance(user)
    if not freelance:
        return
    tech_ids = validated_data["technology_ids"]
    technologies = Technologie.objects.filter(pk__in=tech_ids)
    freelance.technologies.set(technologies)


def _save_experience(user: User, validated_data: Any) -> None:
    """
    Sauvegarde les expériences.
    Accepte une liste d'expériences (remplacement complet).
    """
    freelance = _get_freelance(user)
    if not freelance:
        return

    if isinstance(validated_data, list):
        # Remplacement complet : supprimer les anciennes et recréer
        freelance.experiences.all().delete()
        for exp_data in validated_data:
            Experience.objects.create(freelance=freelance, **exp_data)
    else:
        # Donnée unique
        Experience.objects.create(freelance=freelance, **validated_data)


def _save_formation(user: User, validated_data: Any) -> None:
    """
    Sauvegarde les formations.
    Accepte une liste de formations (remplacement complet).
    """
    freelance = _get_freelance(user)
    if not freelance:
        return

    if isinstance(validated_data, list):
        freelance.educations.all().delete()
        for edu_data in validated_data:
            Education.objects.create(freelance=freelance, **edu_data)
    else:
        Education.objects.create(freelance=freelance, **validated_data)


def _save_realisations(user: User, validated_data: Any) -> None:
    """
    Sauvegarde les réalisations.
    Accepte une liste de réalisations (remplacement complet).
    """
    freelance = _get_freelance(user)
    if not freelance:
        return

    if isinstance(validated_data, list):
        freelance.realisations.all().delete()
        for real_data in validated_data:
            Realisation.objects.create(freelance=freelance, **real_data)
    else:
        Realisation.objects.create(freelance=freelance, **validated_data)


def _save_type_annonceur(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde le type d'annonceur."""
    announcer = _get_announcer(user)
    if not announcer:
        return
    announcer.typeAnnonceur = validated_data["typeAnnonceur"]
    announcer.save(update_fields=["typeAnnonceur"])


def _save_infos_entreprise(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde les infos entreprise de l'annonceur."""
    announcer = _get_announcer(user)
    if not announcer:
        return
    announcer.company_name = validated_data["company_name"]
    announcer.company_secteur = validated_data["company_secteur"]
    announcer.company_website = validated_data.get("company_website", "")
    announcer.save(update_fields=["company_name", "company_secteur", "company_website"])


def _save_finalisation_freelance(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde la finalisation freelance — photo + GitHub."""
    freelance = _get_freelance(user)
    if not freelance:
        return

    github_url = validated_data.get("githubUrl", "")
    if github_url:
        freelance.githubUrl = github_url
        freelance.save(update_fields=["githubUrl"])

    # La photo de profil est gérée séparément via le fichier uploadé
    # (voir le traitement dans la vue)


def _save_finalisation_annonceur(user: User, validated_data: Dict[str, Any]) -> None:
    """Sauvegarde la finalisation annonceur — photo uniquement."""
    # La photo de profil est gérée séparément via le fichier uploadé
    # (voir le traitement dans la vue)
    pass


# Mapping étape → fonction de sauvegarde
STEP_SAVE_FUNCTIONS = {
    "identite": _save_identite,
    "role": _save_role,
    "presentation": _save_presentation,
    "service": _save_service,
    "technologies": _save_technologies,
    "experience": _save_experience,
    "formation": _save_formation,
    "realisations": _save_realisations,
    "type_annonceur": _save_type_annonceur,
    "infos_entreprise": _save_infos_entreprise,
}


# =============================================================================
# PERMISSION
# =============================================================================

class IsOnboardingComplete(BasePermission):
    """
    Permission DRF : bloque l'accès aux vues dashboard
    tant que l'onboarding n'est pas terminé.
    """
    message = "Vous devez compléter votre onboarding avant d'accéder à cette fonctionnalité."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.onboarding_completed


# =============================================================================
# VUES
# =============================================================================

class OnboardingStatusView(APIView):
    """
    GET /api/onboarding/status/

    Retourne l'état complet de l'onboarding :
    - étape actuelle
    - liste complète des étapes attendues (selon le rôle)
    - données déjà saisies pour chaque étape complétée
    """
    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        user = request.user
        steps = get_steps_for_user(user)
        current_step = user.onboarding_step

        # Construire la liste des étapes avec leur statut
        current_idx = get_step_index(steps, current_step)
        step_list = []
        for i, step_name in enumerate(steps):
            step_status = "pending"
            if user.onboarding_completed:
                step_status = "completed"
            elif i < current_idx:
                step_status = "completed"
            elif i == current_idx:
                step_status = "current"

            step_list.append({
                "name": step_name,
                "index": i,
                "status": step_status,
                "is_skippable": step_name in SKIPPABLE_STEPS,
                "is_mandatory": step_name in MANDATORY_STEPS,
            })

        # Collecter les données complétées
        completed_data = _collect_completed_data(user, steps)

        return Response({
            "onboarding_completed": user.onboarding_completed,
            "onboarding_step": current_step,
            "role": user.role,
            "steps": step_list,
            "completed_data": completed_data,
        }, status=status.HTTP_200_OK)


class OnboardingStepView(APIView):
    """
    POST /api/onboarding/<step_name>/

    Soumet les données d'une étape. Règles strictes :
    - L'étape demandée doit correspondre exactement à onboarding_step
    - La validation est déléguée au serializer de l'étape
    - La sauvegarde est progressive (immédiate)
    - Après sauvegarde, onboarding_step avance à l'étape suivante

    Pour les étapes répétables (experience, formation, realisations),
    le payload est une liste d'objets sous la clé "items".
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def put(self, request, step_name: str) -> Response:
        return self.post(request, step_name)

    def patch(self, request, step_name: str) -> Response:
        return self.post(request, step_name)

    def post(self, request, step_name: str) -> Response:
        user = request.user

        # Vérifier que l'onboarding n'est pas déjà terminé
        if user.onboarding_completed:
            return Response(
                {"detail": "L'onboarding est déjà terminé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        steps = get_steps_for_user(user)

        # Vérifier que l'étape existe dans la séquence de l'utilisateur
        if step_name not in steps:
            return Response(
                {
                    "detail": f"L'étape '{step_name}' n'existe pas dans votre parcours d'onboarding.",
                    "current_step": user.onboarding_step,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que l'utilisateur n'essaie pas de sauter des étapes non complétées
        step_idx = get_step_index(steps, step_name)
        current_idx = get_step_index(steps, user.onboarding_step)

        if current_idx != -1 and step_idx > current_idx:
            return Response(
                {
                    "detail": (
                        f"Vous ne pouvez pas accéder à l'étape '{step_name}'. "
                        f"Vous devez d'abord compléter l'étape '{user.onboarding_step}'."
                    ),
                    "current_step": user.onboarding_step,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Étapes répétables : experience, formation, realisations
        repeatable_steps = {"experience", "formation", "realisations"}

        if step_name in repeatable_steps:
            return self._handle_repeatable_step(request, user, step_name, steps)

        # Obtenir le serializer
        serializer_class = get_serializer_for_step(user, step_name)
        if serializer_class is None:
            return Response(
                {"detail": f"Aucun serializer configuré pour l'étape '{step_name}'."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Déterminer l'instance pour les ModelSerializer
        instance = self._get_instance_for_step(user, step_name)

        # Construire le serializer
        if instance:
            serializer = serializer_class(
                instance=instance,
                data=request.data,
                context={"request": request},
            )
        else:
            serializer = serializer_class(
                data=request.data,
                context={"request": request},
            )

        serializer.is_valid(raise_exception=True)

        # Sauvegarder via la fonction dédiée
        save_fn = STEP_SAVE_FUNCTIONS.get(step_name)
        if save_fn:
            save_fn(user, serializer.validated_data)

        # Traitement spécial pour la finalisation
        if step_name == "finalisation":
            return self._handle_finalisation(request, user, serializer)

        # Avancer à l'étape suivante
        next_step = get_next_step(user, step_name)

        # Cas spécial : annonceur particulier, sauter infos_entreprise
        if step_name == "type_annonceur":
            type_annonceur = serializer.validated_data["typeAnnonceur"]
            if type_annonceur == TypeAnnouncer.PARTICULIER and next_step == "infos_entreprise":
                next_step = "finalisation"

        if next_step:
            user.onboarding_step = next_step
            user.save(update_fields=["onboarding_step"])
        else:
            # Dernière étape => marquer onboarding terminé
            user.onboarding_completed = True
            user.save(update_fields=["onboarding_completed"])

        # Recharger les steps après éventuel changement de rôle
        updated_steps = get_steps_for_user(user)

        return Response(
            {
                "message": f"Étape '{step_name}' validée avec succès.",
                "next_step": next_step,
                "onboarding_completed": user.onboarding_completed,
                "steps": updated_steps,
            },
            status=status.HTTP_200_OK,
        )

    def _handle_repeatable_step(
        self, request, user: User, step_name: str, steps: List[str]
    ) -> Response:
        """Traite les étapes répétables (experience, formation, realisations)."""
        items = request.data.get("items", [])

        if not isinstance(items, list):
            return Response(
                {"detail": "Le champ 'items' doit être une liste."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not items:
            return Response(
                {
                    "detail": (
                        f"Aucune donnée fournie pour l'étape '{step_name}'. "
                        "Utilisez l'endpoint /onboarding/skip/ pour sauter cette étape."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valider chaque item individuellement
        serializer_class = get_serializer_for_step(user, step_name)
        validated_items = []
        all_errors = []

        for idx, item_data in enumerate(items):
            serializer = serializer_class(
                data=item_data,
                context={"request": request},
            )
            if serializer.is_valid():
                validated_items.append(serializer.validated_data)
            else:
                all_errors.append({f"item_{idx}": serializer.errors})

        if all_errors:
            return Response(
                {"detail": "Erreurs de validation.", "errors": all_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Sauvegarder
        save_fn = STEP_SAVE_FUNCTIONS.get(step_name)
        if save_fn:
            save_fn(user, validated_items)

        # Avancer
        next_step = get_next_step(user, step_name)
        if next_step:
            user.onboarding_step = next_step
            user.save(update_fields=["onboarding_step"])

        return Response(
            {
                "message": f"Étape '{step_name}' validée avec succès ({len(validated_items)} élément(s)).",
                "next_step": next_step,
                "onboarding_completed": user.onboarding_completed,
            },
            status=status.HTTP_200_OK,
        )

    def _handle_finalisation(self, request, user: User, serializer) -> Response:
        """Traite l'étape de finalisation — upload photo + marquer terminé."""
        # Gestion de la photo de profil (fichier uploadé)
        photo_file = request.FILES.get("profile_picture")
        if photo_file:
            user.profile_picture = photo_file
            user.save(update_fields=["profile_picture"])

        # Sauvegarder les données du serializer (githubUrl pour freelance)
        if user.role == UserRole.FREELANCE:
            _save_finalisation_freelance(user, serializer.validated_data)

        # Marquer l'onboarding comme terminé
        user.onboarding_completed = True
        user.onboarding_step = "finalisation"
        user.save(update_fields=["onboarding_completed", "onboarding_step"])

        return Response(
            {
                "message": "Onboarding terminé avec succès ! Bienvenue sur Teranga Work.",
                "onboarding_completed": True,
            },
            status=status.HTTP_200_OK,
        )

    def _get_instance_for_step(self, user: User, step_name: str):
        """Retourne l'instance existante pour un ModelSerializer (mise à jour)."""
        if step_name == "identite":
            return user
        if step_name in ("presentation", "finalisation"):
            if user.role == UserRole.FREELANCE:
                return _get_freelance(user)
            if user.role == UserRole.ANNONCEUR and step_name == "finalisation":
                return _get_announcer(user)
        if step_name == "infos_entreprise":
            return _get_announcer(user)
        return None


class OnboardingSkipView(APIView):
    """
    POST /api/onboarding/skip/<step_name>/

    Saute une étape optionnelle. Uniquement autorisé pour :
    experience, formation, realisations.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, step_name: str) -> Response:
        user = request.user

        if user.onboarding_completed:
            return Response(
                {"detail": "L'onboarding est déjà terminé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que l'étape est sautable
        if step_name not in SKIPPABLE_STEPS:
            return Response(
                {
                    "detail": (
                        f"L'étape '{step_name}' est obligatoire et ne peut pas être sautée. "
                        f"Étapes sautables : {', '.join(sorted(SKIPPABLE_STEPS))}."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        steps = get_steps_for_user(user)

        # Vérifier que l'étape existe dans la séquence
        if step_name not in steps:
            return Response(
                {"detail": f"L'étape '{step_name}' n'existe pas dans votre parcours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Séquentialité : on ne peut sauter que l'étape actuelle
        if step_name != user.onboarding_step:
            return Response(
                {
                    "detail": (
                        f"Vous ne pouvez sauter que l'étape actuelle ('{user.onboarding_step}'), "
                        f"pas l'étape '{step_name}'."
                    ),
                    "current_step": user.onboarding_step,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Avancer à l'étape suivante
        next_step = get_next_step(user, step_name)
        if next_step:
            user.onboarding_step = next_step
            user.save(update_fields=["onboarding_step"])

        return Response(
            {
                "message": f"Étape '{step_name}' sautée.",
                "next_step": next_step,
                "onboarding_completed": user.onboarding_completed,
            },
            status=status.HTTP_200_OK,
        )


class OnboardingBackView(APIView):
    """
    POST /api/onboarding/back/<step_name>/

    Permet de revenir sur une étape déjà validée pour la modifier.
    Ne casse pas la progression : les étapes suivantes déjà complétées
    restent intactes, l'utilisateur reviendra simplement à cette étape.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, step_name: str) -> Response:
        user = request.user
        steps = get_steps_for_user(user)

        # Vérifier que l'étape existe dans la séquence
        if step_name not in steps:
            return Response(
                {"detail": f"L'étape '{step_name}' n'existe pas dans votre parcours."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier que l'étape a déjà été complétée (index < index actuel)
        step_idx = get_step_index(steps, step_name)
        current_idx = get_step_index(steps, user.onboarding_step)

        # Si onboarding terminé, on peut revenir sur n'importe quelle étape
        if user.onboarding_completed:
            # Cas spécial : le rôle ne peut pas être modifié
            if step_name == "role":
                return Response(
                    {"detail": "Le rôle ne peut pas être modifié après sa sélection."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.onboarding_step = step_name
            user.onboarding_completed = False
            user.save(update_fields=["onboarding_step", "onboarding_completed"])
            return Response(
                {
                    "message": f"Retour à l'étape '{step_name}'. Vous pouvez la modifier.",
                    "current_step": step_name,
                },
                status=status.HTTP_200_OK,
            )

        if step_idx >= current_idx:
            return Response(
                {
                    "detail": (
                        f"L'étape '{step_name}' n'a pas encore été complétée. "
                        "Vous ne pouvez revenir que sur une étape déjà validée."
                    ),
                    "current_step": user.onboarding_step,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cas spécial : le rôle ne peut pas être modifié
        if step_name == "role":
            return Response(
                {"detail": "Le rôle ne peut pas être modifié après sa sélection."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Revenir à l'étape demandée sans effacer la progression
        user.onboarding_step = step_name
        user.save(update_fields=["onboarding_step"])

        return Response(
            {
                "message": f"Retour à l'étape '{step_name}'. Vous pouvez la modifier.",
                "current_step": step_name,
            },
            status=status.HTTP_200_OK,
        )
