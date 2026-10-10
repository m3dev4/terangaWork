from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from Service.models import Service
from User.models import User, UserRole
from announcer.models import Announcer
from freelance.models import Freelancee
from mission.models import Mission, MissionStatus
from notification.models import Notification
from proposition.models import Proposition, PropositionStatus

from .models import (
    ActionHistorique,
    DemandeAnnulation,
    Historique,
    Livrable,
    Phase,
    StatutLivrable,
    StatutPhase,
    TypeCommentaire,
    TypePhase,
)


class SuiviMissionTests(APITestCase):
    def setUp(self):
        service = Service.objects.create(name="Développement web")
        self.annonceur_user = User.objects.create_user(
            email="annonceur@example.com", password="pass12345", role=UserRole.ANNONCEUR,
            first_name="Awa", last_name="Diop", number_phone="770000001",
        )
        self.annonceur = Announcer.objects.create(user=self.annonceur_user)
        self.freelance_user = User.objects.create_user(
            email="freelance@example.com", password="pass12345", role=UserRole.FREELANCE,
            first_name="Moussa", last_name="Fall", number_phone="770000002",
        )
        self.freelance = Freelancee.objects.create(
            user=self.freelance_user, title="Dev", description="Profil"
        )
        self.autre_user = User.objects.create_user(
            email="autre@example.com", password="pass12345", role=UserRole.FREELANCE,
            first_name="Autre", last_name="Freelance", number_phone="770000003",
        )
        self.admin_user = User.objects.create_superuser(
            email="admin@example.com", password="pass12345",
            first_name="Admin", last_name="TW", number_phone="770000009",
        )
        self.mission = Mission.objects.create(
            title="Site vitrine", description="Un site", operateurMobileMoney="WAVE",
            budget=50000, service=service, annonceur=self.annonceur,
            status=MissionStatus.OPEN,
            date_deadline=timezone.localdate() + timedelta(days=30),
        )
        self.proposition = Proposition.objects.create(
            lettre_motivation="Motivé", freelance=self.freelance, mission=self.mission,
            date_livraison=timezone.localdate() + timedelta(days=20),
        )

    # -- helpers -----------------------------------------------------------

    def accepter_candidature(self):
        self.client.force_authenticate(self.annonceur_user)
        url = reverse("proposition-detail", args=[self.proposition.id])
        resp = self.client.patch(url, {"proposition_status": PropositionStatus.ACCEPTED}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.mission.refresh_from_db()

    def soumettre(self, titre="Cadrage", user=None):
        self.client.force_authenticate(user or self.freelance_user)
        return self.client.post(
            reverse("suivi-soumettre-livrable", args=[self.mission.id]),
            {"titre": titre, "lien": "https://www.figma.com/file/abc"},
            format="json",
        )

    # -- phase 1 -----------------------------------------------------------

    def test_acceptation_ouvre_le_cadrage_et_notifie_le_freelance(self):
        self.accepter_candidature()
        self.assertEqual(self.mission.status, MissionStatus.IN_PROGRESS)
        phase = Phase.objects.get(mission=self.mission)
        self.assertEqual(phase.type, TypePhase.CADRAGE)
        self.assertEqual(phase.date_limite, timezone.localdate() + timedelta(days=5))
        self.assertTrue(
            Notification.objects.filter(utilisateur=self.freelance_user, type="CADRAGE_A_LIVRER").exists()
        )
        self.assertTrue(
            Historique.objects.filter(mission=self.mission, action=ActionHistorique.PHASE_OUVERTE).exists()
        )

    def test_seul_le_freelance_assigne_peut_soumettre(self):
        self.accepter_candidature()
        resp = self.soumettre(user=self.autre_user)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_un_seul_cadrage_en_attente(self):
        self.accepter_candidature()
        self.assertEqual(self.soumettre().status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.soumettre().status_code, status.HTTP_400_BAD_REQUEST)

    def test_refus_du_cadrage_exige_un_commentaire(self):
        self.accepter_candidature()
        livrable_id = self.soumettre().data["id"]
        self.client.force_authenticate(self.annonceur_user)
        url = reverse("suivi-invalider-livrable", args=[livrable_id])
        resp = self.client.post(url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Livrable.objects.get(pk=livrable_id).statut, StatutLivrable.A_VALIDER)

        resp = self.client.post(url, {"texte": "Il manque l'arborescence."}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["statut"], StatutLivrable.INVALIDE)
        # Le freelance peut resoumettre après un refus.
        self.assertEqual(self.soumettre("Cadrage v2").status_code, status.HTTP_201_CREATED)

    def test_refus_avec_message_vocal(self):
        self.accepter_candidature()
        livrable_id = self.soumettre().data["id"]
        self.client.force_authenticate(self.annonceur_user)
        vocal = SimpleUploadedFile("motif.webm", b"fake-audio", content_type="audio/webm")
        resp = self.client.post(
            reverse("suivi-invalider-livrable", args=[livrable_id]),
            {"fichier_vocal": vocal},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["commentaires"][0]["type"], TypeCommentaire.VOCAL)

    def test_validation_du_cadrage_ouvre_la_phase_2_sans_commentaire(self):
        self.accepter_candidature()
        livrable_id = self.soumettre().data["id"]
        self.client.force_authenticate(self.annonceur_user)
        resp = self.client.post(reverse("suivi-valider-livrable", args=[livrable_id]), {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        cadrage = Phase.objects.get(mission=self.mission, type=TypePhase.CADRAGE)
        dev = Phase.objects.get(mission=self.mission, type=TypePhase.DEVELOPPEMENT)
        self.assertEqual(cadrage.statut, StatutPhase.VALIDEE)
        self.assertEqual(dev.statut, StatutPhase.EN_COURS)
        self.assertEqual(dev.date_limite, self.proposition.date_livraison)
        # Les livrables suivants vont en phase 2, plusieurs à la fois.
        self.assertEqual(self.soumettre("Maquettage").data["phase_type"], TypePhase.DEVELOPPEMENT)
        self.assertEqual(self.soumettre("Intégration").status_code, status.HTTP_201_CREATED)

    def test_seul_l_annonceur_examine(self):
        self.accepter_candidature()
        livrable_id = self.soumettre().data["id"]
        self.client.force_authenticate(self.freelance_user)
        resp = self.client.post(reverse("suivi-valider-livrable", args=[livrable_id]), {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # -- retards -----------------------------------------------------------

    def test_retard_de_cadrage_notifie_admin_et_annonceur_une_seule_fois(self):
        self.accepter_candidature()
        Phase.objects.filter(mission=self.mission).update(
            date_limite=timezone.localdate() - timedelta(days=1)
        )
        call_command("detecter_retards_suivi", stdout=open("/dev/null", "w"))
        call_command("detecter_retards_suivi", stdout=open("/dev/null", "w"))
        self.assertEqual(
            Notification.objects.filter(type="RETARD_CADRAGE", utilisateur=self.admin_user).count(), 1
        )
        self.assertEqual(
            Notification.objects.filter(type="RETARD_CADRAGE", utilisateur=self.annonceur_user).count(), 1
        )
        # Le système ne décide rien : la mission reste en cours.
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.IN_PROGRESS)

    def test_annonceur_repousse_la_deadline(self):
        self.accepter_candidature()
        nouvelle = timezone.localdate() + timedelta(days=10)
        self.client.force_authenticate(self.annonceur_user)
        resp = self.client.post(
            reverse("suivi-repousser-deadline", args=[self.mission.id]),
            {"date_limite": nouvelle.isoformat()},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(Phase.objects.get(mission=self.mission).date_limite, nouvelle)

    def test_livrable_sans_reponse_alerte_l_admin_qui_relance(self):
        self.accepter_candidature()
        livrable_id = self.soumettre().data["id"]
        Livrable.objects.filter(pk=livrable_id).update(
            date_soumission=timezone.now() - timedelta(days=4)
        )
        call_command("detecter_retards_suivi", stdout=open("/dev/null", "w"))
        self.assertTrue(
            Notification.objects.filter(type="RETARD_VALIDATION", utilisateur=self.admin_user).exists()
        )
        # Aucune validation automatique.
        self.assertEqual(Livrable.objects.get(pk=livrable_id).statut, StatutLivrable.A_VALIDER)

        self.client.force_authenticate(self.admin_user)
        resp = self.client.post(
            reverse("suivi-relancer", args=[self.mission.id]), {"destinataire": "annonceur"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(type="RELANCE_SUIVI", utilisateur=self.annonceur_user).exists()
        )

    def test_relance_reservee_a_l_admin(self):
        self.accepter_candidature()
        self.client.force_authenticate(self.annonceur_user)
        resp = self.client.post(
            reverse("suivi-relancer", args=[self.mission.id]), {"destinataire": "freelance"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # -- annulation --------------------------------------------------------

    def test_annulation_demandee_par_l_annonceur_decidee_par_l_admin(self):
        self.accepter_candidature()
        self.client.force_authenticate(self.annonceur_user)
        resp = self.client.post(reverse("suivi-demander-annulation", args=[self.mission.id]))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        demande_id = resp.data["id"]
        # La demande seule n'annule rien.
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.IN_PROGRESS)

        # L'annonceur ne peut pas décider lui-même.
        resp = self.client.post(
            reverse("suivi-decider-annulation", args=[demande_id]), {"decision": "accepter"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin_user)
        resp = self.client.post(
            reverse("suivi-decider-annulation", args=[demande_id]), {"decision": "accepter"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.CANCELLED)
        self.assertTrue(
            Notification.objects.filter(type="MISSION_ANNULEE", utilisateur=self.freelance_user).exists()
        )

    def test_annulation_refusee_la_mission_continue(self):
        self.accepter_candidature()
        demande = DemandeAnnulation.objects.create(mission=self.mission, annonceur=self.annonceur)
        self.client.force_authenticate(self.admin_user)
        resp = self.client.post(
            reverse("suivi-decider-annulation", args=[demande.id]), {"decision": "refuser"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.IN_PROGRESS)

    # -- historique --------------------------------------------------------

    def test_historique_accessible_aux_participants_seulement(self):
        self.accepter_candidature()
        self.soumettre()
        url = reverse("suivi-historique", args=[self.mission.id])
        self.client.force_authenticate(self.freelance_user)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 2)
        self.client.force_authenticate(self.autre_user)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
