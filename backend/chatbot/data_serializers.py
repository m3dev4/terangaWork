from rest_framework import serializers

from freelance.models import Freelancee, Experience
from announcer.models import Announcer
from mission.models import Mission
from proposition.models import Proposition
from User.models import User


class MissionMinimalSerializer(serializers.ModelSerializer):
    service = serializers.CharField(source="service.name", read_only=True, allow_null=True)
    statut = serializers.CharField(source="status")

    class Meta:
        model = Mission
        fields = [
            "id",
            "title",
            "description",
            "budget",
            "date_deadline",
            "service",
            "statut",
        ]


class PropositionFreelanceSerializer(serializers.ModelSerializer):
    mission = MissionMinimalSerializer(read_only=True)
    statut = serializers.CharField(source="proposition_status")

    class Meta:
        model = Proposition
        fields = [
            "id",
            "lettre_motivation",
            "date_livraison",
            "statut",
            "created_at",
            "mission",
        ]


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "entreprise",
            "poste",
            "startDate",
            "endDate",
            "current",
        ]


class FreelanceProfilSerializer(serializers.ModelSerializer):
    service = serializers.CharField(source="service.name", read_only=True, allow_null=True)
    technologies = serializers.ListField(
        child=serializers.CharField(), source="technologies_names"
    )
    experiences = ExperienceSerializer(many=True, read_only=True)

    class Meta:
        model = Freelancee
        fields = [
            "title",
            "description",
            "service",
            "technologies",
            "experiences",
        ]

    def to_representation(self, instance: Freelancee):
        data = super().to_representation(instance)
        data["technologies"] = [t.name for t in instance.technologies.all()]
        return data


class AnnonceurMissionSerializer(serializers.ModelSerializer):
    service = serializers.CharField(source="service.name", read_only=True, allow_null=True)
    statut = serializers.CharField(source="status")
    count_candidatures = serializers.IntegerField(read_only=True)

    class Meta:
        model = Mission
        fields = [
            "id",
            "title",
            "description",
            "budget",
            "date_deadline",
            "service",
            "statut",
            "count_candidatures",
            "created_at",
        ]


class FreelanceCandidatInfoSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.CharField(source="user.email")
    profile_picture = serializers.ImageField(source="user.profile_picture", read_only=True, allow_null=True)
    technologies = serializers.SerializerMethodField()
    annees_experience = serializers.SerializerMethodField()

    class Meta:
        model = Freelancee
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "title",
            "profile_picture",
            "technologies",
            "annees_experience",
        ]

    def get_technologies(self, obj: Freelancee) -> list[str]:
        return [t.name for t in obj.technologies.all()]

    def get_annees_experience(self, obj: Freelancee):
        from matching.services import get_freelance_experience_years
        return get_freelance_experience_years(obj)


class PropositionCandidatSerializer(serializers.ModelSerializer):
    freelance = FreelanceCandidatInfoSerializer(read_only=True)
    statut = serializers.CharField(source="proposition_status")

    class Meta:
        model = Proposition
        fields = [
            "id",
            "freelance",
            "statut",
            "date_livraison",
            "lettre_motivation",
            "created_at",
        ]
