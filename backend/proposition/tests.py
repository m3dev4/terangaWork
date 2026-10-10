from datetime import date, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from Service.models import Service
from User.models import User, UserRole
from announcer.models import Announcer
from freelance.models import Education, Experience, Freelancee, Realisation
from mission.models import Mission, MissionStatus
from .models import Proposition


class PropositionViewSetTests(APITestCase):
    def setUp(self):
        self.service = Service.objects.create(name="Développement web")
        self.announcer_user = User.objects.create_user(
            email="announcer@example.com",
            password="password123",
            role=UserRole.ANNONCEUR,
            first_name="Announceur",
            last_name="Test",
            number_phone="770000001",
        )
        self.announcer_profile = Announcer.objects.create(user=self.announcer_user)
        self.freelance_user = User.objects.create_user(
            email="freelance@example.com",
            password="password123",
            role=UserRole.FREELANCE,
            first_name="Freelance",
            last_name="Test",
            number_phone="770000002",
        )
        self.freelance_profile = Freelancee.objects.create(
            user=self.freelance_user,
            title="Développeur Fullstack",
            description="Profil de test",
        )
        self.freelance_profile.services.add(self.service)
        self.mission = Mission.objects.create(
            title="Créer un site vitrine",
            description="Projet de développement d'un site vitrine pour une startup.",
            date_deadline=date(2026, 12, 31),
            operateurMobileMoney="WAVE",
            budget=500000,
            service=self.service,
            annonceur=self.announcer_profile,
            status=MissionStatus.OPEN,  # seule une mission publiée accepte des candidatures
        )
        self.list_url = reverse("proposition-list")

    def test_freelance_can_create_proposition_before_mission_deadline(self):
        self.client.force_authenticate(self.freelance_user)

        response = self.client.post(
            self.list_url,
            {
                "mission": self.mission.pk,
                "lettre_motivation": "Je suis motivé pour ce projet.",
                "date_livraison": "2026-12-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["mission"], self.mission.pk)
        self.assertEqual(response.data["proposition_status"], "PENDING")

    def test_proposed_delivery_date_cannot_exceed_mission_deadline(self):
        self.client.force_authenticate(self.freelance_user)

        response = self.client.post(
            self.list_url,
            {
                "mission": self.mission.pk,
                "lettre_motivation": "Je soumets une date trop tardive.",
                "date_livraison": "2027-01-02",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_livraison", response.data)

    def test_freelance_cannot_submit_two_proposals_for_same_mission(self):
        self.client.force_authenticate(self.freelance_user)

        first_response = self.client.post(
            self.list_url,
            {
                "mission": self.mission.pk,
                "lettre_motivation": "Première proposition.",
                "date_livraison": "2026-12-10",
            },
            format="json",
        )
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        second_response = self.client.post(
            self.list_url,
            {
                "mission": self.mission.pk,
                "lettre_motivation": "Seconde proposition interdite.",
                "date_livraison": "2026-12-20",
            },
            format="json",
        )

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("non_field_errors", second_response.data)

    def submit(self, **changes):
        self.client.force_authenticate(self.freelance_user)
        payload = {
            "mission": self.mission.pk,
            "lettre_motivation": "Je souhaite réaliser cette mission.",
            **changes,
        }
        return self.client.post(self.list_url, payload, format="json")

    def test_current_date_uses_mission_deadline_without_client_date(self):
        response = self.submit(currentDate=True)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["currentDate"])
        self.assertEqual(Proposition.objects.get().date_livraison, self.mission.date_deadline)

    def test_current_date_cannot_override_announcer_deadline(self):
        response = self.submit(currentDate=True, date_livraison="2027-01-01")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["date_livraison"], "2026-12-31")

    def test_custom_date_can_equal_deadline(self):
        response = self.submit(currentDate=False, date_livraison="2026-12-31")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["currentDate"])

    def test_custom_date_is_required(self):
        response = self.submit(currentDate=False)
        self.assertEqual(response.status_code, 400)
        self.assertIn("date_livraison", response.data)

    def test_past_date_is_rejected(self):
        response = self.submit(currentDate=False, date_livraison=str(timezone.localdate() - timedelta(days=1)))
        self.assertEqual(response.status_code, 400)
        self.assertIn("date_livraison", response.data)

    def test_mission_without_deadline_requires_custom_date(self):
        self.mission.date_deadline = None
        self.mission.save()
        response = self.submit(currentDate=True)
        self.assertEqual(response.status_code, 400)
        self.assertIn("currentDate", response.data)
        response = self.submit(currentDate=False, date_livraison="2026-12-15")
        self.assertEqual(response.status_code, 201)

    def test_partial_update_validates_against_existing_mission(self):
        created = self.submit(currentDate=False, date_livraison="2026-12-15")
        url = reverse("proposition-detail", args=[created.data["id"]])
        response = self.client.patch(url, {"date_livraison": "2027-01-01"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("date_livraison", response.data)
        self.assertEqual(Proposition.objects.get().date_livraison, date(2026, 12, 15))

    def test_freelance_can_switch_between_mission_and_custom_date(self):
        created = self.submit(currentDate=True)
        url = reverse("proposition-detail", args=[created.data["id"]])
        response = self.client.patch(url, {"currentDate": False}, format="json")
        self.assertEqual(response.status_code, 400)
        response = self.client.patch(url, {"currentDate": False, "date_livraison": "2026-12-15"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["currentDate"])
        response = self.client.patch(url, {"currentDate": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["date_livraison"], "2026-12-31")

    def test_status_update_does_not_change_saved_delivery_date(self):
        created = self.submit(currentDate=True)
        original_deadline = self.mission.date_deadline
        self.mission.date_deadline = date(2026, 12, 20)
        self.mission.save()
        self.client.force_authenticate(self.announcer_user)
        response = self.client.patch(reverse("proposition-detail", args=[created.data["id"]]), {"proposition_status": "REJECTED"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Proposition.objects.get().date_livraison, original_deadline)

    def test_announcer_can_read_candidate_professional_profile(self):
        created = self.submit(currentDate=True)
        Experience.objects.create(freelance=self.freelance_profile, entreprise="Studio", poste="Développeur", startDate=date(2024, 1, 1), current=True)
        Education.objects.create(freelance=self.freelance_profile, role="UNIVERSITAIRE", nom="Informatique", startDate=date(2020, 1, 1))
        Realisation.objects.create(freelance=self.freelance_profile, title="Portfolio", link="https://example.com")
        self.client.force_authenticate(self.announcer_user)
        response = self.client.get(reverse("proposition-profil-freelance", args=[created.data["id"]]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.freelance_profile.id)
        self.assertEqual(response.data["services_detail"][0]["id"], self.service.id)
        self.assertEqual(response.data["experiences"][0]["entreprise"], "Studio")
        self.assertEqual(response.data["educations"][0]["nom"], "Informatique")
        self.assertEqual(response.data["realisations"][0]["title"], "Portfolio")
        self.assertNotIn("email", response.data)
        self.assertNotIn("number_phone", response.data)

    def test_candidate_profile_access_is_limited_to_mission_announcer(self):
        created = self.submit(currentDate=True)
        url = reverse("proposition-profil-freelance", args=[created.data["id"]])
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url).status_code, 401)
        other = User.objects.create_user(email="other@example.com", password="password123", role=UserRole.ANNONCEUR, number_phone="770000003")
        Announcer.objects.create(user=other)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(url).status_code, 404)
