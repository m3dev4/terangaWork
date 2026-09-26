from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Count, Sum, Avg, Prefetch
from django.utils import timezone
from datetime import timedelta

from .models import User, Signalement, UserRole
from mission.models import Mission
from paiement.models import Paiement, StatutCollecte, StatutDecaissement
from paiement.services import synchroniser_statuts_paiement
from Service.models import Service
from Technologie.models import Technologie


class SignalementSerializer(serializers.ModelSerializer):
    reporter_email = serializers.ReadOnlyField(source="reporter.email")
    reporter_name = serializers.SerializerMethodField()
    reported_user_email = serializers.ReadOnlyField(source="reported_user.email")
    mission_title = serializers.ReadOnlyField(source="mission.title")

    class Meta:
        model = Signalement
        fields = [
            "id",
            "reporter",
            "reporter_email",
            "reporter_name",
            "reported_user",
            "reported_user_email",
            "mission",
            "mission_title",
            "category",
            "reason",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reporter", "created_at", "updated_at"]

    def get_reporter_name(self, obj):
        if obj.reporter:
            return f"{obj.reporter.first_name} {obj.reporter.last_name}".strip() or obj.reporter.email
        return "Anonyme"


class SignalementViewSet(viewsets.ModelViewSet):
    """ViewSet pour la création et le suivi des signalements de modération."""

    queryset = Signalement.objects.all()
    serializer_class = SignalementSerializer

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class AdminDashboardStatsView(APIView):
    """API retournant les données agrégées pour le tableau de bord Bento Grid d'administration."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()

        # 1. Utilisateurs
        total_users = User.objects.count()
        freelance_count = User.objects.filter(role="freelance").count()
        annonceur_count = User.objects.filter(role="annonceur").count()
        admin_count = User.objects.filter(is_staff=True).count()

        user_breakdown = [
            {"name": "Freelances", "value": freelance_count, "color": "#1b4b6b"},
            {"name": "Annonceurs", "value": annonceur_count, "color": "#f2994a"},
            {"name": "Admins", "value": admin_count, "color": "#64748b"},
        ]

        # 2. Missions
        total_missions = Mission.objects.count()
        open_missions = Mission.objects.filter(status="OPEN").count()
        in_progress_missions = Mission.objects.filter(status="IN_PROGRESS").count()
        delivered_missions = Mission.objects.filter(status="DELIVERED").count()
        completed_missions = Mission.objects.filter(status="COMPLETED").count()
        closed_missions = Mission.objects.filter(status="CLOSED").count()

        mission_status_breakdown = [
            {"status": "OPEN", "label": "Ouvertes", "count": open_missions, "color": "#3b82f6"},
            {"status": "IN_PROGRESS", "label": "En cours", "count": in_progress_missions, "color": "#f59e0b"},
            {"status": "DELIVERED", "label": "Livrées", "count": delivered_missions, "color": "#8b5cf6"},
            {"status": "COMPLETED", "label": "Terminées", "count": completed_missions, "color": "#10b981"},
            {"status": "CLOSED", "label": "Fermées", "count": closed_missions, "color": "#6b7280"},
        ]

        avg_budget = Mission.objects.aggregate(avg=Avg("budget"))["avg"] or 0

        # 3. Paiements
        total_paiements = Paiement.objects.count()
        totaux_financiers = Paiement.objects.aggregate(
            sum_brut=Sum("montant_brut"),
            sum_comm=Sum("montant_commission"),
            sum_net=Sum("montant_net"),
        )
        sum_brut = totaux_financiers["sum_brut"] or 0
        sum_comm = totaux_financiers["sum_comm"] or 0
        sum_net = totaux_financiers["sum_net"] or 0

        collecte_en_attente = Paiement.objects.filter(statut_collecte="EN_ATTENTE").count()
        collecte_reussi = Paiement.objects.filter(statut_collecte="REUSSI").count()
        collecte_echoue = Paiement.objects.filter(statut_collecte="ECHOUE").count()

        decaissement_non_declenche = Paiement.objects.filter(statut_decaissement="NON_DECLENCHE").count()
        decaissement_en_attente = Paiement.objects.filter(statut_decaissement="EN_ATTENTE").count()
        decaissement_reussi = Paiement.objects.filter(statut_decaissement="REUSSI").count()

        # 4. Signalements
        total_signalements = Signalement.objects.count()
        pending_signalements = Signalement.objects.filter(status="PENDING").count()
        resolved_signalements = Signalement.objects.filter(status="RESOLVED").count()
        dismissed_signalements = Signalement.objects.filter(status="DISMISSED").count()

        # 5. Surplus / Insights Catalogue
        top_services = list(
            Service.objects.annotate(mission_count=Count("mission"))
            .order_by("-mission_count")[:5]
            .values("id", "name", "mission_count")
        )

        top_technologies = list(
            Technologie.objects.annotate(mission_count=Count("missions"))
            .order_by("-mission_count")[:5]
            .values("id", "name", "imgUrl", "mission_count")
        )

        data = {
            "users": {
                "total": total_users,
                "freelance": freelance_count,
                "annonceur": annonceur_count,
                "admin": admin_count,
                "breakdown": user_breakdown,
            },
            "missions": {
                "total": total_missions,
                "open": open_missions,
                "in_progress": in_progress_missions,
                "delivered": delivered_missions,
                "completed": completed_missions,
                "closed": closed_missions,
                "status_breakdown": mission_status_breakdown,
                "avg_budget": round(avg_budget, 2),
            },
            "paiements": {
                "total_count": total_paiements,
                "montant_brut": float(sum_brut),
                "montant_commission": float(sum_comm),
                "montant_net": float(sum_net),
                "collecte": {
                    "en_attente": collecte_en_attente,
                    "reussi": collecte_reussi,
                    "echoue": collecte_echoue,
                },
                "decaissement": {
                    "non_declenche": decaissement_non_declenche,
                    "en_attente": decaissement_en_attente,
                    "reussi": decaissement_reussi,
                },
            },
            "signalements": {
                "total": total_signalements,
                "pending": pending_signalements,
                "resolved": resolved_signalements,
                "dismissed": dismissed_signalements,
            },
            "surplus": {
                "top_services": top_services,
                "top_technologies": top_technologies,
            },
        }

        return Response(data, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    """Statistiques du dashboard Bento pour le freelance ou l'annonceur connecté."""

    permission_classes = [IsAuthenticated]

    @staticmethod
    def _serialize_paiement_row(paiement: Paiement, *, for_freelance: bool) -> dict:
        mission = paiement.proposition.mission
        row = {
            "paiement_id": paiement.id,
            "mission_id": mission.id,
            "mission_title": mission.title,
            "statut_collecte": paiement.statut_collecte,
            "statut_decaissement": paiement.statut_decaissement,
            "montant_brut": float(paiement.montant_brut),
            "montant_net": float(paiement.montant_net),
            "montant_commission": float(paiement.montant_commission),
            "date_collecte": paiement.date_collecte.isoformat() if paiement.date_collecte else None,
            "date_decaissement": paiement.date_decaissement.isoformat() if paiement.date_decaissement else None,
            "reference_collecte": paiement.reference_collecte,
            "reference_decaissement": paiement.reference_decaissement,
        }
        if not for_freelance:
            freelance = paiement.proposition.freelance
            user = freelance.user
            row["freelance_id"] = freelance.id
            row["freelance_nom"] = (
                f"{user.first_name} {user.last_name}".strip() or user.username
            )
            row["freelance_email"] = user.email
        return row

    def get_freelance_stats(self, request):
        from paiement.models import Paiement

        paiements = (
            Paiement.objects.filter(
                proposition__freelance__user=request.user,
            )
            .select_related(
                "proposition",
                "proposition__mission",
                "proposition__freelance",
                "proposition__freelance__user",
            )
            .order_by("-created_at")
        )

        for p in paiements[:5]:
            try:
                synchroniser_statuts_paiement(p)
            except Exception:
                pass

        agg_reussi = Paiement.objects.filter(
            proposition__freelance__user=request.user,
            statut_decaissement=StatutDecaissement.REUSSI,
        ).aggregate(total=Sum("montant_net"))
        total_earned_net = float(agg_reussi["total"] or 0)

        agg_en_cours = Paiement.objects.filter(
            proposition__freelance__user=request.user,
            statut_collecte__in=[
                StatutCollecte.EN_ATTENTE,
                StatutCollecte.REUSSI,
            ],
            statut_decaissement__in=[
                StatutDecaissement.NON_DECLENCHE,
                StatutDecaissement.EN_ATTENTE,
            ],
        ).aggregate(total=Sum("montant_net"))
        total_pending_net = float(agg_en_cours["total"] or 0)

        transactions = [
            self._serialize_paiement_row(p, for_freelance=True)
            for p in paiements[:5]
        ]

        return Response(
            {
                "role": "freelance",
                "total_earned_net": total_earned_net,
                "total_pending_net": total_pending_net,
                "transactions_count": paiements.count(),
                "transactions": transactions,
            },
            status=status.HTTP_200_OK,
        )

    def get_annonceur_stats(self, request):
        paiements = (
            Paiement.objects.filter(
                proposition__mission__annonceur__user=request.user,
            )
            .select_related(
                "proposition",
                "proposition__mission",
                "proposition__mission__annonceur",
                "proposition__mission__annonceur__user",
                "proposition__freelance",
                "proposition__freelance__user",
            )
            .order_by("-created_at")
        )

        for p in paiements[:5]:
            try:
                synchroniser_statuts_paiement(p)
            except Exception:
                pass

        agg_reussi = Paiement.objects.filter(
            proposition__mission__annonceur__user=request.user,
            statut_collecte=StatutCollecte.REUSSI,
        ).aggregate(
            brut=Sum("montant_brut"),
            commission=Sum("montant_commission"),
            net=Sum("montant_net"),
        )
        total_spent_brut = float(agg_reussi["brut"] or 0)
        total_paid_commissions = float(agg_reussi["commission"] or 0)
        total_disbursed_net = float(agg_reussi["net"] or 0)

        agg_en_cours = Paiement.objects.filter(
            proposition__mission__annonceur__user=request.user,
            statut_collecte=StatutCollecte.EN_ATTENTE,
        ).aggregate(total=Sum("montant_brut"))
        total_pending_brut = float(agg_en_cours["total"] or 0)

        transactions = [
            self._serialize_paiement_row(p, for_freelance=False)
            for p in paiements[:5]
        ]

        return Response(
            {
                "role": "annonceur",
                "total_spent_brut": total_spent_brut,
                "total_paid_commissions": total_paid_commissions,
                "total_disbursed_net": total_disbursed_net,
                "total_pending_brut": total_pending_brut,
                "transactions_count": paiements.count(),
                "transactions": transactions,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        if request.user.role == UserRole.FREELANCE:
            return self.get_freelance_stats(request)
        if request.user.role == UserRole.ANNONCEUR:
            return self.get_annonceur_stats(request)
        return Response(
            {"error": "Rôle utilisateur non supporté pour ce dashboard."},
            status=status.HTTP_403_FORBIDDEN,
        )
