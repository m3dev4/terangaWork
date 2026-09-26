from unittest.mock import MagicMock, patch
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from User.models import User, UserRole
from announcer.models import Announcer
from freelance.models import Freelancee
from mission.models import Mission, MissionStatus, OperateurMobileMoneyType
from Service.models import Service
from proposition.models import Proposition, PropositionStatus
from paiement.models import NumeroPaiement, Paiement, StatutCollecte, StatutDecaissement
from paiement.paydunya_client import PayDunyaClient
from paiement.services import (
    DuplicatePaymentError,
    InvalidMissionStatusError,
    NumeroPaiementManquantError,
    initiate_collection,
    process_collection_webhook,
    process_disbursement_webhook,
    trigger_disbursement,
)


class PaiementFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.annonceur_user = User.objects.create_user(
            email="annonceur@test.com",
            password="Password123!",
            first_name="Annonceur",
            last_name="Test",
            number_phone="770000001",
            role=UserRole.ANNONCEUR,
        )
        self.annonceur_profile = Announcer.objects.create(
            user=self.annonceur_user,
            company_name="Test Company",
        )

        self.freelance_user = User.objects.create_user(
            email="freelance@test.com",
            password="Password123!",
            first_name="Freelance",
            last_name="Test",
            number_phone="770000002",
            role=UserRole.FREELANCE,
        )
        self.service = Service.objects.create(name="Développement Web", description="Dev")
        self.freelance_profile = Freelancee.objects.create(
            user=self.freelance_user,
            title="Dev Fullstack",
            description="Expert Django & React",
            service=self.service,
        )

        self.other_user = User.objects.create_user(
            email="other@test.com",
            password="Password123!",
            first_name="Other",
            last_name="User",
            number_phone="770000003",
            role=UserRole.FREELANCE,
        )

        # Mission
        self.mission = Mission.objects.create(
            title="Création site web",
            description="Site vitrine complet",
            budget=50000,
            service=self.service,
            annonceur=self.annonceur_profile,
            operateurMobileMoney=OperateurMobileMoneyType.WAVE,
            status=MissionStatus.OPEN,
        )

        # Proposition
        self.proposition = Proposition.objects.create(
            mission=self.mission,
            freelance=self.freelance_profile,
            lettre_motivation="Je suis prêt",
            date_livraison=timezone.now().date(),
            proposition_status=PropositionStatus.ACCEPTED,
        )
        self.mission.status = MissionStatus.IN_PROGRESS
        self.mission.save()

    def test_workflow_preconditions(self):
        """Vérifie le respect strict du workflow: IN_PROGRESS -> DELIVERED -> COMPLETED -> /payer/"""
        # 1. Annonceur essaie de payer alors que statut = IN_PROGRESS -> Refus 400
        self.client.force_authenticate(user=self.annonceur_user)
        res = self.client.post(f"/api/missions/{self.mission.id}/payer/")
        self.assertEqual(res.status_code, 400)

        # 2. Annonceur essaie de valider la livraison avant qu'elle soit marquée livrée -> Refus 400
        res = self.client.post(f"/api/missions/{self.mission.id}/valider-livraison/")
        self.assertEqual(res.status_code, 400)

        # 3. Freelance marque livrée -> Succès IN_PROGRESS -> DELIVERED
        self.client.force_authenticate(user=self.freelance_user)
        res = self.client.post(f"/api/missions/{self.mission.id}/marquer-livree/")
        self.assertEqual(res.status_code, 200)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.DELIVERED)

        # 4. Annonceur valide livraison -> Succès DELIVERED -> COMPLETED
        self.client.force_authenticate(user=self.annonceur_user)
        res = self.client.post(f"/api/missions/{self.mission.id}/valider-livraison/")
        self.assertEqual(res.status_code, 200)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.COMPLETED)

    def test_confirmer_numero_paiement(self):
        """Vérifie la confirmation et réutilisation du numéro de paiement mobile money"""
        self.client.force_authenticate(user=self.freelance_user)

        # 1. Premier enregistrement (aucun numéro existant) sans body -> 400
        res = self.client.post(f"/api/propositions/{self.proposition.id}/confirmer-numero-paiement/")
        self.assertEqual(res.status_code, 400)

        # 2. Enregistrement avec un numéro -> 200
        res = self.client.post(
            f"/api/propositions/{self.proposition.id}/confirmer-numero-paiement/",
            {"numero": "771234567"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(NumeroPaiement.objects.filter(freelance=self.freelance_profile, operateur=OperateurMobileMoneyType.WAVE, numero="771234567").exists())

        # 3. Deuxième confirmation pour une autre proposition/mission avec le MÊME opérateur -> Réutilisation automatique sans renvoyer numero
        res = self.client.post(
            f"/api/propositions/{self.proposition.id}/confirmer-numero-paiement/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["numero_paiement"]["numero"], "771234567")

    def test_initiate_collection_and_idempotency_409(self):
        """Vérifie que /payer/ crée le paiement et qu'une deuxième tentative renvoie 409 Conflict"""
        self.mission.status = MissionStatus.COMPLETED
        self.mission.save()

        mock_paydunya = MagicMock()
        mock_paydunya.create_checkout_invoice.return_value = {
            "token": "token_checkout_123",
            "response_text": "https://paydunya.com/checkout/token_checkout_123",
            "response_code": "00",
        }

        # Premier appel -> 200
        with patch("paiement.services.PayDunyaClient", return_value=mock_paydunya):
            self.client.force_authenticate(user=self.annonceur_user)
            res = self.client.post(f"/api/missions/{self.mission.id}/payer/")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data["token"], "token_checkout_123")
            self.assertIn("payment_url", res.data)

        # Deuxième appel alors que statut_collecte == EN_ATTENTE -> 409 Conflict
        self.client.force_authenticate(user=self.annonceur_user)
        res = self.client.post(f"/api/missions/{self.mission.id}/payer/")
        self.assertEqual(res.status_code, 409)
        self.assertIn("déjà en cours", res.data["error"])

    def test_paydunya_string_amounts_and_double_disburse_sequence(self):
        """
        Verrouille:
        - Les montants sont envoyés sous forme de chaînes ("50000") à PayDunya.
        - submit_disburse_invoice est appelé IMMÉDIATEMENT après create_disburse_invoice dans trigger_disbursement.
        """
        self.mission.status = MissionStatus.COMPLETED
        self.mission.save()

        # Enregistre le numéro de paiement du freelance
        NumeroPaiement.objects.create(
            freelance=self.freelance_profile,
            operateur=OperateurMobileMoneyType.WAVE,
            numero="779998877",
        )

        paiement = Paiement.objects.create(
            proposition=self.proposition,
            montant_brut=Decimal("50000.00"),
            taux_commission=Decimal("0.10"),
            montant_commission=Decimal("5000.00"),
            montant_net=Decimal("45000.00"),
            statut_collecte=StatutCollecte.REUSSI,
            statut_decaissement=StatutDecaissement.NON_DECLENCHE,
            reference_collecte="token_coll_123",
        )

        mock_paydunya = MagicMock()
        mock_paydunya.create_disburse_invoice.return_value = {
            "disburse_token": "token_disburse_999",
            "response_code": "00",
        }
        mock_paydunya.submit_disburse_invoice.return_value = {
            "response_code": "00",
            "response_text": "Disburse submitted",
        }

        # Déclenche le décaissement
        trigger_disbursement(paiement, paydunya_client=mock_paydunya)

        # Assert 1: create_disburse_invoice appelé avec montant string "45000.00"
        mock_paydunya.create_disburse_invoice.assert_called_once()
        _, kwargs = mock_paydunya.create_disburse_invoice.call_args
        self.assertEqual(kwargs["account_alias"], "779998877")
        self.assertIsInstance(kwargs["amount"], str)
        self.assertEqual(kwargs["amount"], "45000.00")

        # Assert 2: submit_disburse_invoice appelé immédiatement avec le disburse_token retourné
        mock_paydunya.submit_disburse_invoice.assert_called_once_with("token_disburse_999")

        paiement.refresh_from_db()
        self.assertEqual(paiement.reference_decaissement, "token_disburse_999")
        self.assertEqual(paiement.statut_decaissement, StatutDecaissement.EN_ATTENTE)

    def test_missing_numero_paiement_raises_exception(self):
        """Vérifie qu'une exception explicite est levée si aucun NumeroPaiement n'existe au décaissement"""
        paiement = Paiement.objects.create(
            proposition=self.proposition,
            montant_brut=Decimal("50000.00"),
            taux_commission=Decimal("0.10"),
            montant_commission=Decimal("5000.00"),
            montant_net=Decimal("45000.00"),
            statut_collecte=StatutCollecte.REUSSI,
        )

        mock_client = MagicMock()
        with self.assertRaises(NumeroPaiementManquantError):
            trigger_disbursement(paiement, paydunya_client=mock_client)

    def test_webhooks_double_verification(self):
        """Vérifie la revérification obligatoire auprès de PayDunya dans les webhooks"""
        paiement = Paiement.objects.create(
            proposition=self.proposition,
            montant_brut=Decimal("10000.00"),
            taux_commission=Decimal("0.10"),
            montant_commission=Decimal("1000.00"),
            montant_net=Decimal("9000.00"),
            statut_collecte=StatutCollecte.EN_ATTENTE,
            reference_collecte="ref_coll_abc",
        )

        NumeroPaiement.objects.create(
            freelance=self.freelance_profile,
            operateur=OperateurMobileMoneyType.WAVE,
            numero="775554433",
        )

        mock_paydunya = MagicMock()
        mock_paydunya.confirm_checkout_invoice.return_value = {
            "status": "completed",
        }
        mock_paydunya.create_disburse_invoice.return_value = {
            "disburse_token": "ref_disb_xyz",
        }
        mock_paydunya.submit_disburse_invoice.return_value = {"response_code": "00"}

        # 1. Webhook collecte
        process_collection_webhook("ref_coll_abc", {"status": "completed"}, paydunya_client=mock_paydunya)

        paiement.refresh_from_db()
        self.assertEqual(paiement.statut_collecte, StatutCollecte.REUSSI)
        self.assertIsNotNone(paiement.date_collecte)
        self.assertEqual(paiement.statut_decaissement, StatutDecaissement.EN_ATTENTE)
        self.assertEqual(paiement.reference_decaissement, "ref_disb_xyz")

        # 2. Webhook décaissement
        mock_paydunya.check_disburse_status.return_value = {
            "status": "success",
        }

        process_disbursement_webhook("ref_disb_xyz", {"status": "success"}, paydunya_client=mock_paydunya)

        paiement.refresh_from_db()
        self.assertEqual(paiement.statut_decaissement, StatutDecaissement.REUSSI)
        self.assertIsNotNone(paiement.date_decaissement)

    def test_historique_paiement_permissions(self):
        """Vérifie l'accès à l'historique de paiement réservé à l'annonceur et au freelance assigné"""
        paiement = Paiement.objects.create(
            proposition=self.proposition,
            montant_brut=Decimal("10000.00"),
            taux_commission=Decimal("0.10"),
            montant_commission=Decimal("1000.00"),
            montant_net=Decimal("9000.00"),
            statut_collecte=StatutCollecte.REUSSI,
            statut_decaissement=StatutDecaissement.REUSSI,
        )

        # 1. Annonceur propriétaire -> 200
        self.client.force_authenticate(user=self.annonceur_user)
        res = self.client.get(f"/api/missions/{self.mission.id}/historique-paiement/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["statut_collecte"], "REUSSI")

        # 2. Freelance assigné -> 200
        self.client.force_authenticate(user=self.freelance_user)
        res = self.client.get(f"/api/missions/{self.mission.id}/historique-paiement/")
        self.assertEqual(res.status_code, 200)

        # 3. Autre utilisateur -> 403 Forbidden
        self.client.force_authenticate(user=self.other_user)
        res = self.client.get(f"/api/missions/{self.mission.id}/historique-paiement/")
        self.assertEqual(res.status_code, 403)
