from django.core.exceptions import ValidationError
from rest_framework import serializers
from django.utils import timezone

from mission.models import MissionStatus
from paiement.models import NumeroPaiement
from freelance.serializers import FreelanceeSerializer

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


class PropositionFreelanceProfileSerializer(FreelanceeSerializer):
    """Profil professionnel consultable par l'annonceur de la proposition."""

    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    profile_picture = serializers.ImageField(source="user.profile_picture", read_only=True)
    ville = serializers.CharField(source="user.ville", read_only=True)

    class Meta(FreelanceeSerializer.Meta):
        fields = FreelanceeSerializer.Meta.fields + [
            "first_name", "last_name", "profile_picture", "ville",
        ]


class PropositionSerializer(serializers.ModelSerializer):
    """Valide une proposition d'un freelance sur une mission."""

    freelance_info = FreelanceInfoSerializer(source="*", read_only=True)
    date_livraison = serializers.DateField(required=False)
    mission_title = serializers.CharField(source="mission.title", read_only=True)
    mission_budget = serializers.IntegerField(source="mission.budget", read_only=True)
    mission_status = serializers.CharField(source="mission.status", read_only=True)
    mission_operateur = serializers.CharField(
        source="mission.operateurMobileMoney", read_only=True
    )
    numero_paiement_confirme = serializers.SerializerMethodField()
    numero_paiement = serializers.SerializerMethodField()

    has_paiement = serializers.SerializerMethodField()
    paiement_statut_collecte = serializers.SerializerMethodField()
    paiement_statut_decaissement = serializers.SerializerMethodField()
    paiement_montant_brut = serializers.SerializerMethodField()
    paiement_montant_net = serializers.SerializerMethodField()
    paiement_date_collecte = serializers.SerializerMethodField()
    paiement_date_decaissement = serializers.SerializerMethodField()

    class Meta:
        model = Proposition
        fields = [
            "id",
            "lettre_motivation",
            "date_livraison",
            "currentDate",
            "mission",
            "mission_title",
            "mission_budget",
            "mission_status",
            "mission_operateur",
            "numero_paiement_confirme",
            "numero_paiement",
            "freelance",
            "freelance_info",
            "proposition_status",
            "created_at",
            "updated_at",
            "has_paiement",
            "paiement_statut_collecte",
            "paiement_statut_decaissement",
            "paiement_montant_brut",
            "paiement_montant_net",
            "paiement_date_collecte",
            "paiement_date_decaissement",
        ]
        read_only_fields = [
            "id",
            "freelance",
            "freelance_info",
            "created_at",
            "updated_at",
            "has_paiement",
            "paiement_statut_collecte",
            "paiement_statut_decaissement",
            "paiement_montant_brut",
            "paiement_montant_net",
            "paiement_date_collecte",
            "paiement_date_decaissement",
        ]

    def _get_numero_paiement(self, obj):
        return NumeroPaiement.objects.filter(
            freelance=obj.freelance,
            operateur=obj.mission.operateurMobileMoney,
        ).first()

    def _get_paiement(self, obj):
        return getattr(obj, "paiement", None)

    def get_numero_paiement_confirme(self, obj):
        return self._get_numero_paiement(obj) is not None

    def get_numero_paiement(self, obj):
        request = self.context.get("request")
        if (
            request
            and request.user.is_authenticated
            and request.user == obj.freelance.user
        ):
            numero = self._get_numero_paiement(obj)
            return numero.numero if numero else None
        return None

    def get_has_paiement(self, obj):
        return self._get_paiement(obj) is not None

    def get_paiement_statut_collecte(self, obj):
        paiement = self._get_paiement(obj)
        return paiement.statut_collecte if paiement else None

    def get_paiement_statut_decaissement(self, obj):
        paiement = self._get_paiement(obj)
        return paiement.statut_decaissement if paiement else None

    def get_paiement_montant_brut(self, obj):
        paiement = self._get_paiement(obj)
        return paiement.montant_brut if paiement else None

    def get_paiement_montant_net(self, obj):
        paiement = self._get_paiement(obj)
        return paiement.montant_net if paiement else None

    def get_paiement_date_collecte(self, obj):
        paiement = self._get_paiement(obj)
        if paiement and paiement.date_collecte:
            return paiement.date_collecte.isoformat()
        return None

    def get_paiement_date_decaissement(self, obj):
        paiement = self._get_paiement(obj)
        if paiement and paiement.date_decaissement:
            return paiement.date_decaissement.isoformat()
        return None

    def validate_lettre_motivation(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError(
                "La lettre de motivation est obligatoire."
            )
        return cleaned

    def validate(self, attrs):
        mission = attrs.get("mission", getattr(self.instance, "mission", None))
        schedule_changed = self.instance is None or any(
            field in attrs for field in ("mission", "date_livraison", "currentDate")
        )
        if schedule_changed and mission:
            current_date = attrs.get("currentDate", getattr(self.instance, "currentDate", False))
            date_livraison = attrs.get("date_livraison", getattr(self.instance, "date_livraison", None))
            if current_date:
                if not mission.date_deadline:
                    raise serializers.ValidationError({
                        "currentDate": "Cette mission n'a pas de date limite à conserver. Choisissez une date de livraison."
                    })
                date_livraison = mission.date_deadline
                attrs["date_livraison"] = date_livraison
            elif not date_livraison or (
                self.instance and self.instance.currentDate and "date_livraison" not in attrs
            ):
                raise serializers.ValidationError({"date_livraison": "Veuillez proposer une date de livraison."})

            if mission.date_deadline and date_livraison > mission.date_deadline:
                raise serializers.ValidationError(
                    {
                        "date_livraison": "La date de livraison proposée ne peut pas dépasser la deadline de la mission."
                    }
                )
            if date_livraison < timezone.localdate():
                raise serializers.ValidationError({
                    "date_livraison": "La date de livraison ne peut pas être antérieure à aujourd'hui."
                })

        if self.instance is None and mission and mission.status != MissionStatus.OPEN:
            raise serializers.ValidationError(
                "Cette mission n'accepte plus de candidatures."
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
            validated_data["room_name"] = f"terangawork-livekit-{uuid.uuid4().hex[:8]}"
        if not validated_data.get("link"):
            room = validated_data.get("room_name")
            validated_data["link"] = f"https://meet.livekit.io/{room}"

        return super().create(validated_data)


