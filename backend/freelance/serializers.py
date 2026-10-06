from typing import Any

from rest_framework import serializers

from Technologie.models import Technologie
from User.models import UserRole

from .models import Education, Experience, Freelancee, Realisation


class ExperienceSerializer(serializers.ModelSerializer):
    """Valide et sérialise une expérience du freelance connecté."""

    class Meta:
        model = Experience
        fields = [
            "id",
            "entreprise",
            "poste",
            "startDate",
            "endDate",
            "current",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        start = attrs.get("startDate", getattr(self.instance, "startDate", None))
        end = attrs.get("endDate", getattr(self.instance, "endDate", None))
        current = attrs.get("current", getattr(self.instance, "current", False))
        if end and start and end < start:
            raise serializers.ValidationError(
                {"endDate": "La date de fin doit être postérieure à la date de début."}
            )
        if current and end:
            raise serializers.ValidationError(
                {"endDate": "Une expérience en cours ne peut pas avoir de date de fin."}
            )
        return attrs


class EducationSerializer(serializers.ModelSerializer):
    """Valide et sérialise une formation du freelance connecté."""

    class Meta:
        model = Education
        fields = [
            "id",
            "role",
            "nom",
            "startDate",
            "endDate",
            "current",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        start = attrs.get("startDate", getattr(self.instance, "startDate", None))
        end = attrs.get("endDate", getattr(self.instance, "endDate", None))
        current = attrs.get("current", getattr(self.instance, "current", False))
        if end and start and end < start:
            raise serializers.ValidationError(
                {"endDate": "La date de fin doit être postérieure à la date de début."}
            )
        if current and end:
            raise serializers.ValidationError(
                {"endDate": "Une formation en cours ne peut pas avoir de date de fin."}
            )
        return attrs


class RealisationSerializer(serializers.ModelSerializer):
    """Valide et sérialise une réalisation du freelance connecté."""

    class Meta:
        model = Realisation
        fields = ["id", "title", "link", "created_at"]
        read_only_fields = ["id", "created_at"]


from Service.models import Service
from Service.serialiser import ServiceSerialiser
from Technologie.serializers import TechnologieSerializer


class FreelanceeSerializer(serializers.ModelSerializer):
    """Crée ou met à jour l'unique profil freelance de l'utilisateur."""

    services = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(),
        many=True,
        required=True,
    )
    services_detail = ServiceSerialiser(source="services", many=True, read_only=True)
    technologies = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        queryset=Technologie.objects.all(),
    )
    technologies_detail = TechnologieSerializer(source="technologies", many=True, read_only=True)
    experiences = ExperienceSerializer(many=True, read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    realisations = RealisationSerializer(many=True, read_only=True)

    class Meta:
        model = Freelancee
        fields = [
            "id",
            "title",
            "description",
            "githubUrl",
            "linkedinUrl",
            "services",
            "services_detail",
            "technologies",
            "technologies_detail",
            "experiences",
            "educations",
            "realisations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "services_detail",
            "technologies_detail",
            "experiences",
            "educations",
            "realisations",
            "created_at",
            "updated_at",
        ]

    def validate_services(self, value):
        """Valide que le freelance a entre 1 et 3 services."""
        if value is not None and (len(value) < 1 or len(value) > 3):
            raise serializers.ValidationError("Vous devez choisir entre 1 et 3 services.")
        return value

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le titre professionnel est obligatoire.")
        return value

    def validate_description(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La description est obligatoire.")
        return value

    def create(self, validated_data: dict[str, Any]) -> Freelancee:
        user = self.context["request"].user
        if user.role != UserRole.FREELANCE:
            raise serializers.ValidationError(
                "Seul un utilisateur ayant le rôle freelance peut créer ce profil."
            )
        if Freelancee.objects.filter(user=user).exists():
            raise serializers.ValidationError("Vous possédez déjà un profil freelance.")
        technologies = validated_data.pop("technologies", [])
        profile = Freelancee.objects.create(user=user, **validated_data)
        profile.technologies.set(technologies)
        return profile

    def update(
        self, instance: Freelancee, validated_data: dict[str, Any]
    ) -> Freelancee:
        if instance.user.role != UserRole.FREELANCE:
            raise serializers.ValidationError(
                "Seul un utilisateur ayant le rôle freelance peut modifier ce profil."
            )
        technologies = validated_data.pop("technologies", None)
        services = validated_data.pop("services", None)

        # Mettre à jour les champs simples
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        if validated_data:
            instance.save(update_fields=list(validated_data.keys()))

        # Mettre à jour les technologies (ManyToManyField)
        if technologies is not None:
            instance.technologies.set(technologies)

        # Mettre à jour les services (ManyToManyField)
        if services is not None:
            instance.services.set(services)

        return instance
