"""
Serializers pour le processus d'onboarding séquentiel.

Chaque étape a son propre serializer avec validation isolée.
Les étapes obligatoires ne peuvent pas être sautées.
Les étapes optionnelles (experience, formation, realisations) peuvent être sautées.
"""

from typing import Any, Dict, List, Optional

from rest_framework import serializers

from Service.models import Service
from Technologie.models import Technologie
from User.models import User, UserRole
from freelance.models import (
    Education,
    Experience,
    Freelancee,
    Realisation,
    educationRole,
)
from announcer.models import Announcer, TypeAnnouncer

# =============================================================================
# ÉTAPES COMMUNES
# =============================================================================


class IdentiteSerializer(serializers.ModelSerializer):
    """Étape 1 : Identité - Prénom, Nom, Téléphone (obligatoire pour tous)."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "number_phone"]
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
            "number_phone": {"required": True, "allow_blank": False},
        }

    def validate_number_phone(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le numéro de téléphone est obligatoire.")
        # Validation basique : chiffres, espaces, +, -, ., (, )
        import re

        if not re.match(r"^[\d\s\+\-\.\(\)]+$", value):
            raise serializers.ValidationError(
                "Le numéro de téléphone contient des caractères invalides."
            )
        return value


class RoleSerializer(serializers.Serializer):
    """Étape 2 : Choix du rôle (obligatoire pour tous)."""

    role = serializers.ChoiceField(
        choices=UserRole.choices,
        required=True,
        error_messages={
            "required": "Le rôle est obligatoire.",
            "invalid_choice": "Le rôle doit être 'freelance' ou 'annonceur'.",
        },
    )

    def validate_role(self, value: str) -> str:
        user = self.context["request"].user
        if user.onboarding_completed:
            raise serializers.ValidationError(
                "L'onboarding est déjà terminé."
            )
        return value


# =============================================================================
# BRANCHE FREELANCE
# =============================================================================


class FreelancePresentationSerializer(serializers.ModelSerializer):
    """Étape 3 Freelance : Présentation - Titre, Description (obligatoire)."""

    class Meta:
        model = Freelancee
        fields = ["title", "description", "githubUrl", "linkedinUrl"]
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "description": {"required": True, "allow_blank": False},
            "githubUrl": {"required": False, "allow_blank": True},
            "linkedinUrl": {"required": False, "allow_blank": True},
        }

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le titre professionnel est obligatoire.")
        if len(value) > 100:
            raise serializers.ValidationError(
                "Le titre ne peut pas dépasser 100 caractères."
            )
        return value

    def validate_description(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La description est obligatoire.")
        if len(value) > 5000:
            raise serializers.ValidationError(
                "La description ne peut pas dépasser 5000 caractères."
            )
        return value

    def validate_githubUrl(self, value: str) -> str:
        if value:
            value = value.strip()
            if value and not value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    "L'URL GitHub doit commencer par http:// ou https://"
                )
        return value

    def validate_linkedinUrl(self, value: str) -> str:
        if value:
            value = value.strip()
            if value and not value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    "L'URL LinkedIn doit commencer par http:// ou https://"
                )
        return value


class FreelanceServiceSerializer(serializers.Serializer):
    """Étape 4 Freelance : Services - Entre 1 et 3 services choisis (obligatoire)."""

    service_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1,
        max_length=3,
        error_messages={
            "required": "Au moins un service est obligatoire.",
            "min_length": "Au moins un service doit être sélectionné.",
            "max_length": "Vous ne pouvez pas sélectionner plus de 3 services.",
        },
    )

    def validate_service_ids(self, value: List[int]) -> List[int]:
        existing_ids = set(
            Service.objects.filter(pk__in=value).values_list("pk", flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Services inexistants : {sorted(invalid_ids)}"
            )
        return value


class FreelanceTechnologiesSerializer(serializers.Serializer):
    """Étape 5 Freelance : Technologies - Une ou plusieurs (obligatoire)."""

    technology_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1,
        error_messages={
            "required": "Au moins une technologie est obligatoire.",
            "min_length": "Au moins une technologie doit être sélectionnée.",
        },
    )

    def validate_technology_ids(self, value: List[int]) -> List[int]:
        if not value:
            raise serializers.ValidationError(
                "Au moins une technologie doit être sélectionnée."
            )
        existing_ids = set(
            Technologie.objects.filter(pk__in=value).values_list("pk", flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Technologies inexistantes : {sorted(invalid_ids)}"
            )
        return value


class ExperienceSerializer(serializers.ModelSerializer):
    """Serializer pour une expérience (étape 6 Freelance - optionnel)."""

    class Meta:
        model = Experience
        fields = [
            "id",
            "entreprise",
            "poste",
            "description",
            "startDate",
            "endDate",
            "current",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "entreprise": {"required": True, "allow_blank": False},
            "poste": {"required": True, "allow_blank": False},
            "startDate": {"required": True},
            "description": {"required": False, "allow_blank": True},
            "endDate": {"required": False, "allow_null": True},
            "current": {"required": False, "default": False},
        }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        start = attrs.get("startDate")
        end = attrs.get("endDate")
        current = attrs.get("current", False)

        if end and start and end < start:
            raise serializers.ValidationError(
                {"endDate": "La date de fin doit être postérieure à la date de début."}
            )
        if current and end:
            raise serializers.ValidationError(
                {"endDate": "Une expérience en cours ne peut pas avoir de date de fin."}
            )
        if not current and not end:
            raise serializers.ValidationError(
                {
                    "endDate": "La date de fin est obligatoire si le poste n'est pas actuel."
                }
            )
        return attrs


class EducationSerializer(serializers.ModelSerializer):
    """Serializer pour une formation (étape 7 Freelance - optionnel)."""

    class Meta:
        model = Education
        fields = [
            "id",
            "role",
            "nom",
            "etablissement",
            "intitule",
            "date_obtention",
            "lien_verification",
            "startDate",
            "endDate",
            "current",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "role": {"required": True},
            "nom": {"required": True, "allow_blank": False},
            "date_obtention": {"required": True},
            "startDate": {"required": True},
            "etablissement": {"required": False, "allow_blank": True},
            "intitule": {"required": False, "allow_blank": True},
            "lien_verification": {"required": False, "allow_blank": True},
            "endDate": {"required": False, "allow_null": True},
            "current": {"required": False, "default": False},
        }

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        role = attrs.get("role")
        etablissement = attrs.get("etablissement", "").strip()
        intitule = attrs.get("intitule", "").strip()
        lien_verification = attrs.get("lien_verification", "").strip()
        start = attrs.get("startDate")
        end = attrs.get("endDate")
        current = attrs.get("current", False)

        # Validation selon le type de formation
        if role == educationRole.UNIVERSITAIRE:
            if not etablissement:
                raise serializers.ValidationError(
                    {
                        "etablissement": "L'établissement est obligatoire pour une formation universitaire."
                    }
                )
            if not intitule:
                raise serializers.ValidationError(
                    {
                        "intitule": "L'intitulé du diplôme est obligatoire pour une formation universitaire."
                    }
                )
        elif role in [educationRole.FORMATION_PROFESSIONNELLE, educationRole.EN_LIGNE]:
            if not intitule:
                raise serializers.ValidationError(
                    {"intitule": "Le nom de la formation est obligatoire."}
                )
            if lien_verification:
                import re

                if not re.match(r"^https?://", lien_verification):
                    raise serializers.ValidationError(
                        {
                            "lien_verification": "Le lien de vérification doit être une URL valide (http:// ou https://)."
                        }
                    )

        # Validation des dates
        if end and start and end < start:
            raise serializers.ValidationError(
                {"endDate": "La date de fin doit être postérieure à la date de début."}
            )
        if current and end:
            raise serializers.ValidationError(
                {"endDate": "Une formation en cours ne peut pas avoir de date de fin."}
            )
        if not current and not end:
            raise serializers.ValidationError(
                {
                    "endDate": "La date de fin est obligatoire si la formation n'est pas en cours."
                }
            )

        return attrs


class RealisationSerializer(serializers.ModelSerializer):
    """Serializer pour une réalisation (étape 8 Freelance - optionnel)."""

    class Meta:
        model = Realisation
        fields = ["id", "title", "description", "link"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "description": {"required": True, "allow_blank": False},
            "link": {"required": False, "allow_blank": True},
        }

    def validate_link(self, value: str) -> str:
        if value:
            value = value.strip()
            if value and not value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    "Le lien doit être une URL valide (http:// ou https://)."
                )
        return value


class FreelanceFinalisationSerializer(serializers.Serializer):
    """Étape 9 Freelance : Finalisation - Photo, GitHub (obligatoire pour finaliser).

    Note : profile_picture est sur le modèle User, pas Freelancee.
    Le fichier est traité séparément dans la vue via request.FILES.
    """

    profile_picture = serializers.ImageField(required=False, allow_null=True)
    githubUrl = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_githubUrl(self, value: str) -> str:
        if value:
            value = value.strip()
            if value and not value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    "L'URL GitHub doit commencer par http:// ou https://"
                )
        return value


# =============================================================================
# BRANCHE ANNONCEUR
# =============================================================================


class AnnouncerTypeSerializer(serializers.Serializer):
    """Étape 3 Annonceur : Type d'annonceur (obligatoire)."""

    typeAnnonceur = serializers.ChoiceField(
        choices=TypeAnnouncer.choices,
        required=True,
        error_messages={
            "required": "Le type d'annonceur est obligatoire.",
            "invalid_choice": "Le type doit être 'Entreprise' ou 'Particulier'.",
        },
    )


class AnnouncerInfosEntrepriseSerializer(serializers.ModelSerializer):
    """Étape 4 Annonceur : Infos entreprise (sauté si Particulier)."""

    class Meta:
        model = Announcer
        fields = ["company_name", "company_secteur", "company_website"]
        extra_kwargs = {
            "company_name": {"required": True, "allow_blank": False},
            "company_secteur": {"required": True, "allow_blank": False},
            "company_website": {"required": False, "allow_blank": True},
        }

    def validate_company_website(self, value: str) -> str:
        if value:
            value = value.strip()
            if value and not value.startswith(("http://", "https://")):
                raise serializers.ValidationError(
                    "Le site web doit être une URL valide (http:// ou https://)."
                )
        return value


class AnnouncerFinalisationSerializer(serializers.Serializer):
    """Étape 5 Annonceur : Finalisation - Photo uniquement (obligatoire pour finaliser).

    Note : profile_picture est sur le modèle User, pas Announcer.
    Le fichier est traité séparément dans la vue via request.FILES.
    """

    profile_picture = serializers.ImageField(required=False, allow_null=True)


# =============================================================================
# SERIALIZERS DE STATUT ET CONTRÔLE
# =============================================================================


class OnboardingStatusSerializer(serializers.Serializer):
    """Serializer pour l'endpoint GET /onboarding/status/."""

    onboarding_completed = serializers.BooleanField()
    onboarding_step = serializers.CharField()
    role = serializers.CharField(allow_null=True)
    steps = serializers.ListField(child=serializers.DictField())
    completed_data = serializers.DictField()


class SkipStepSerializer(serializers.Serializer):
    """Serializer pour POST /onboarding/skip/<step_name>/."""

    step_name = serializers.CharField()

    # Étapes qui peuvent être sautées
    SKIPPABLE_STEPS = {
        "experience",
        "formation",
        "realisations",
    }

    def validate_step_name(self, value: str) -> str:
        if value not in self.SKIPPABLE_STEPS:
            raise serializers.ValidationError(
                f"L'étape '{value}' ne peut pas être sautée. "
                f"Étapes sautables : {', '.join(sorted(self.SKIPPABLE_STEPS))}"
            )
        return value


class BackToStepSerializer(serializers.Serializer):
    """Serializer pour POST /onboarding/back/<step_name>/."""

    step_name = serializers.CharField()

    def validate_step_name(self, value: str) -> str:
        # La validation de l'existence de l'étape se fait dans la vue
        return value


class OnboardingStepSubmitSerializer(serializers.Serializer):
    """Serializer générique pour soumettre les données d'une étape."""

    step_name = serializers.CharField()
    data = serializers.DictField()
