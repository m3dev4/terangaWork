from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from Service.serialiser import ServiceSerialiser
from Technologie.models import Technologie
from Technologie.serializers import TechnologieSerializer

from .models import MIN_MISSION_BUDGET, Mission


class MissionSerializer(ModelSerializer):
    """Sérialise une mission créée et gérée par son annonceur."""

    technologies = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        queryset=Technologie.objects.all(),
    )
    technologies_detail = TechnologieSerializer(
        source="technologies", many=True, read_only=True
    )
    service_detail = ServiceSerialiser(source="service", read_only=True)

    class Meta:
        model = Mission
        fields = [
            "id",
            "title",
            "description",
            "date_deadline",
            "operateurMobileMoney",
            "budget",
            "service",
            "service_detail",
            "technologies",
            "technologies_detail",
            "annonceur",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "annonceur",
            "service_detail",
            "technologies_detail",
            "created_at",
            "updated_at",
        ]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le titre est obligatoire.")
        return value

    def validate_description(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La description est obligatoire.")
        return value

    def validate_budget(self, value):
        if value < MIN_MISSION_BUDGET:
            raise serializers.ValidationError("Le budget minimum est de 10 000 FCFA.")
        return value
