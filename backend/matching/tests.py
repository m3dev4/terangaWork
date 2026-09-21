from datetime import date
from unittest.mock import patch
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from User.models import User, UserRole
from Service.models import Service
from Technologie.models import Technologie
from announcer.models import Announcer, TypeAnnouncer
from freelance.models import Experience, Freelancee
from mission.models import Mission, MissionStatus
from proposition.models import Proposition
from matching.models import ResultatMatching
from matching.services import MatchingServiceUnavailableError, get_freelance_experience_years


class MatchingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Service & Tech
        self.service_backend = Service.objects.create(name="Développement Backend")
        self.tech_python = Technologie.objects.create(name="Python")
        self.tech_fastapi = Technologie.objects.create(name="FastAPI")

        # Annonceur 1 (Owner)
        self.user_announcer1 = User.objects.create_user(
            email="annonceur1@jefly.com",
            password="Password123!",
            first_name="Alice",
            last_name="Owner",
            number_phone="0102030405",
            role=UserRole.ANNONCEUR,
            onboarding_completed=True,
        )
        self.announcer1 = Announcer.objects.create(
            user=self.user_announcer1,
            typeAnnonceur=TypeAnnouncer.ENTREPRISE,
            company_name="TechCorp",
        )

        # Annonceur 2 (Not Owner)
        self.user_announcer2 = User.objects.create_user(
            email="annonceur2@jefly.com",
            password="Password123!",
            first_name="Bob",
            last_name="Other",
            number_phone="0102030406",
            role=UserRole.ANNONCEUR,
            onboarding_completed=True,
        )
        self.announcer2 = Announcer.objects.create(
            user=self.user_announcer2,
            typeAnnonceur=TypeAnnouncer.PARTICULIER,
        )

        # Freelance
        self.user_freelance = User.objects.create_user(
            email="freelance@jefly.com",
            password="Password123!",
            first_name="Charlie",
            last_name="Dev",
            number_phone="0102030407",
            role=UserRole.FREELANCE,
            onboarding_completed=True,
        )
        self.freelance = Freelancee.objects.create(
            user=self.user_freelance,
            title="Senior Dev Python",
            description="Expert Python et Django",
            service=self.service_backend,
        )
        self.freelance.technologies.add(self.tech_python, self.tech_fastapi)

        # Expérience Freelance (2 ans)
        Experience.objects.create(
            freelance=self.freelance,
            entreprise="OldCorp",
            poste="Backend Dev",
            startDate=date(2022, 1, 1),
            endDate=date(2024, 1, 1),
        )

        # Mission
        self.mission = Mission.objects.create(
            title="Mission FastAPI Backend",
            description="Création de microservice FastAPI",
            budget=200000,
            service=self.service_backend,
            annonceur=self.announcer1,
            status=MissionStatus.OPEN,
        )
        self.mission.technologies.add(self.tech_python, self.tech_fastapi)

        # Proposition
        self.proposition = Proposition.objects.create(
            lettre_motivation="Très intéressé par votre projet FastAPI",
            date_livraison=date(2026, 12, 31),
            freelance=self.freelance,
            mission=self.mission,
        )

    def test_experience_years_calculation(self):
        years = get_freelance_experience_years(self.freelance)
        assert years == 2

    def test_unauthenticated_request_rejected(self):
        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_incomplete_onboarding_rejected(self):
        self.user_announcer1.onboarding_completed = False
        self.user_announcer1.save()
        self.client.force_authenticate(user=self.user_announcer1)

        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_announcer_non_owner_forbidden(self):
        self.client.force_authenticate(user=self.user_announcer2)

        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_freelance_cannot_access_announcer_endpoint(self):
        self.client.force_authenticate(user=self.user_freelance)

        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)
        assert res.status_code == status.HTTP_403_FORBIDDEN

    @patch("matching.services.call_fastapi_matching")
    def test_candidats_recommandes_success(self, mock_fastapi):
        mock_fastapi.return_value = {
            "etage_2_reussi": True,
            "resultats": [
                {
                    "candidat_id": self.proposition.id,
                    "score": 0.95,
                    "score_technologies": 1.0,
                    "score_service": 1.0,
                    "score_experience": 0.4,
                    "justification_ia": "Profil parfaitement adéquat",
                }
            ],
        }

        self.client.force_authenticate(user=self.user_announcer1)
        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)

        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["etage_2_reussi"] is True
        assert len(data["resultats"]) == 1

        cand = data["resultats"][0]
        assert cand["candidat_id"] == self.proposition.id
        assert cand["freelance_nom"] == "Charlie Dev"
        assert cand["justification_ia"] == "Profil parfaitement adéquat"

        # Vérifier la persistance dans ResultatMatching
        assert ResultatMatching.objects.filter(mission=self.mission, proposition=self.proposition).exists()

    @patch("matching.services.call_fastapi_matching")
    def test_missions_recommandees_success(self, mock_fastapi):
        mock_fastapi.return_value = {
            "etage_2_reussi": False,
            "resultats": [
                {
                    "candidat_id": self.mission.id,
                    "score": 0.90,
                    "score_technologies": 1.0,
                    "score_service": 1.0,
                    "score_experience": None,
                    "justification_ia": None,
                }
            ],
        }

        self.client.force_authenticate(user=self.user_freelance)
        url = "/api/matching/missions-recommandees/"
        res = self.client.post(url)

        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["etage_2_reussi"] is False
        assert len(data["resultats"]) == 1

        m = data["resultats"][0]
        assert m["mission_id"] == self.mission.id
        assert m["mission_title"] == "Mission FastAPI Backend"

    @patch("matching.services.call_fastapi_matching")
    def test_microservice_failure_returns_503(self, mock_fastapi):
        mock_fastapi.side_effect = MatchingServiceUnavailableError("Service down")

        self.client.force_authenticate(user=self.user_announcer1)
        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)

        assert res.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert res.json()["detail"] == "Matching temporairement indisponible."
