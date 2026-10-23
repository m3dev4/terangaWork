from datetime import timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from Service.models import Service
from User.models import User, UserRole
from announcer.models import Announcer
from freelance.models import Freelancee
from mission.models import Mission, MissionStatus
from paiement.models import Paiement, StatutCollecte, StatutDecaissement
from proposition.models import Proposition, PropositionStatus

CLE = "cle-interne-de-test-suffisamment-longue-123"


@override_settings(FASTAPI_INTERNAL_API_KEY=CLE)
class ContexteAssistantTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        service = Service.objects.create(name="Développement web")
        self.ann_user = User.objects.create_user(
            email="ann@t.sn", password="pass12345", role=UserRole.ANNONCEUR,
            first_name="Awa", last_name="Diop", number_phone="770000101",
        )
        self.annonceur = Announcer.objects.create(user=self.ann_user)
        self.fr_user = User.objects.create_user(
            email="fr@t.sn", password="pass12345", role=UserRole.FREELANCE,
            first_name="Moussa", last_name="Fall", number_phone="770000102",
        )
        self.freelance = Freelancee.objects.create(user=self.fr_user, title="Dev", description="Court")
        self.freelance.services.add(service)
        mission = Mission.objects.create(
            title="Refonte portfolio", description="Un site", operateurMobileMoney="WAVE",
            budget=100000, service=service, annonceur=self.annonceur,
            status=MissionStatus.COMPLETED,
            date_deadline=timezone.localdate() + timedelta(days=10),
        )
        prop = Proposition.objects.create(
            lettre_motivation="Motivé", freelance=self.freelance, mission=mission,
            date_livraison=timezone.localdate() + timedelta(days=5),
            proposition_status=PropositionStatus.ACCEPTED,
        )
        Paiement.objects.create(
            proposition=prop, montant_brut=Decimal("100000"), taux_commission=Decimal("0.10"),
            montant_commission=Decimal("10000"), montant_net=Decimal("90000"),
            statut_collecte=StatutCollecte.REUSSI, statut_decaissement=StatutDecaissement.REUSSI,
            date_collecte=timezone.now(), date_decaissement=timezone.now() - timedelta(days=3),
        )

    def _get(self, user):
        return self.client.get(
            reverse("chatbot:chat-data-contexte"), {"user_id": user.id}, HTTP_X_INTERNAL_API_KEY=CLE
        )

    def test_refuse_sans_cle_interne(self):
        resp = self.client.get(reverse("chatbot:chat-data-contexte"), {"user_id": self.fr_user.id})
        self.assertIn(resp.status_code, (401, 403))

    def test_contexte_freelance_contient_gains_calcules(self):
        resp = self._get(self.fr_user)
        self.assertEqual(resp.status_code, 200, resp.content)
        ctx = resp.json()["contexte"]
        self.assertEqual(ctx["gains"]["gagne_30_derniers_jours"], 90000.0)
        self.assertEqual(ctx["gains"]["total_gagne_net"], 90000.0)
        self.assertEqual(ctx["statistiques"]["taux_acceptation_pct"], 100)
        self.assertEqual(len(ctx["missions_obtenues"]), 1)
        self.assertIn("realisations_portfolio", ctx["profil"]["completude"]["elements_manquants"])

    def test_contexte_annonceur_contient_depenses(self):
        resp = self._get(self.ann_user)
        self.assertEqual(resp.status_code, 200, resp.content)
        ctx = resp.json()["contexte"]
        self.assertEqual(ctx["depenses"]["total_depense"], 100000.0)
        self.assertEqual(ctx["missions"][0]["freelance_retenu"], "Moussa Fall")
        self.assertNotIn("gains", ctx)
