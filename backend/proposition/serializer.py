from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import Proposition


class FreelanceInfoSerializer(serializers.Serializer):
    """Minimal freelance info embedded in a proposition for announcers."""
    id = serializers.IntegerField(source="freelance.user.id")
    user_id = serializers.IntegerField(source="freelance.user.id")
    freelance_id = serializers.IntegerField(source="freelance.id")
    first_name = serializers.CharField(source="freelance.user.first_name")
    last_name = serializers.CharField(source="freelance.user.last_name")
    profile_picture = serializers.ImageField(
        source="freelance.user.profile_picture", use_url=True, allow_null=True
    )
    title = serializers.CharField(source="freelance.title")
    ville = serializers.CharField(source="freelance.user.ville", allow_null=True, default=None)
    technologies = serializers.SerializerMethodField()

    def get_technologies(self, obj):
        return list(obj.freelance.technologies.values("id", "name"))


class PropositionSerializer(serializers.ModelSerializer):
    """Valide une proposition d'un freelance sur une mission."""

    freelance_info = FreelanceInfoSerializer(source="*", read_only=True)
    mission_title = serializers.CharField(source="mission.title", read_only=True)
    mission_budget = serializers.IntegerField(source="mission.budget", read_only=True)
    mission_status = serializers.CharField(source="mission.status", read_only=True)

    class Meta:
        model = Proposition
        fields = [
            "id",
            "lettre_motivation",
            "date_livraison",
            "mission",
            "mission_title",
            "mission_budget",
            "mission_status",
            "freelance",
            "freelance_info",
            "proposition_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "freelance",
            "freelance_info",
            "created_at",
            "updated_at",
        ]

    def validate_lettre_motivation(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(
                "La lettre de motivation est obligatoire."
            )
        return cleaned

    def validate(self, attrs):
        mission = attrs.get("mission")
        date_livraison = attrs.get("date_livraison")

        if mission and date_livraison and mission.date_deadline:
            if date_livraison > mission.date_deadline:
                raise serializers.ValidationError(
                    {
                        "date_livraison": "La date de livraison proposée ne peut pas dépasser la deadline de la mission."
                    }
                )

        if self.instance is None:
            freelance = getattr(self.context.get("request"), "user", None)
            if freelance and freelance.is_authenticated:
                from freelance.models import Freelancee

                profile = Freelancee.objects.filter(user=freelance).first()
                if (
                    profile
                    and Proposition.objects.filter(
                        freelance=profile, mission=mission
                    ).exists()
                ):
                    raise serializers.ValidationError(
                        "Vous avez déjà déposé une proposition pour cette mission."
                    )

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            from freelance.models import Freelancee

            freelance = Freelancee.objects.filter(user=request.user).first()
            if freelance is not None:
                validated_data["freelance"] = freelance
        return super().create(validated_data)


from .models import ProjectMeeting


class ProjectMeetingSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMeeting
        fields = [
            "id",
            "mission",
            "title",
            "date",
            "time",
            "room_name",
            "link",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return "Utilisateur"

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        if not validated_data.get("room_name"):
            import uuid
            validated_data["room_name"] = f"jefly-livekit-{uuid.uuid4().hex[:8]}"
        if not validated_data.get("link"):
            room = validated_data.get("room_name")
            validated_data["link"] = f"https://meet.livekit.io/{room}"

        return super().create(validated_data)


