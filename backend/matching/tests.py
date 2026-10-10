from datetime import date
from unittest.mock import AsyncMock, patch
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
from matching.services import (
    MatchingServiceUnavailableError,
    evaluer_matching_proactif,
    get_freelance_experience_years,
    lancer_matching_proactif_async,
)
from notification.models import Notification


class MatchingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Service & Tech
        self.service_backend = Service.objects.create(name="Développement Backend")
        self.service_design = Service.objects.create(name="Design UI/UX")
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
        )
        self.freelance.services.add(self.service_design, self.service_backend)
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
        payload = mock_fastapi.call_args.args[0]
        assert payload["service"] == self.service_backend.name
        assert payload["candidats"][0]["services"] == [self.service_design.name, self.service_backend.name]

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
        payload = mock_fastapi.call_args.args[0]
        assert payload["services"] == [self.service_design.name, self.service_backend.name]
        assert payload["candidats"][0]["service"] == self.service_backend.name

    @patch("matching.services.call_fastapi_matching")
    def test_microservice_failure_returns_503(self, mock_fastapi):
        mock_fastapi.side_effect = MatchingServiceUnavailableError("Service down")

        self.client.force_authenticate(user=self.user_announcer1)
        url = f"/api/matching/candidats-recommandes/{self.mission.id}/"
        res = self.client.post(url)

        assert res.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert res.json()["detail"] == "Matching temporairement indisponible."

    @patch("matching.services.call_fastapi_matching")
    def test_initial_compatibility_is_read_only_and_not_limited_to_top_four(self, mock_fastapi):
        for i in range(5):
            Mission.objects.create(title=f"Mission {i}", description="Test", budget=100,
                                   service=self.service_backend, annonceur=self.announcer1,
                                   status=MissionStatus.OPEN)
        self.client.force_authenticate(user=self.user_freelance)
        for coverage, compatible in [(0, False), (.49, False), (.5, True), (1, True)]:
            mock_fastapi.return_value = {"etage_2_reussi": False, "resultats": [{
                "candidat_id": self.mission.id, "score": .5 + coverage / 2,
                "score_technologies": coverage, "score_service": 1,
            }]}
            response = self.client.get("/api/matching/missions-compatibilite/")
            assert response.status_code == 200
            assert response.json()["resultats"][0]["compatible"] is compatible
            payload = mock_fastapi.call_args.args[0]
            assert payload["type_matching"] == "missions"
            assert payload["scoring_only"] is True
            assert payload["top_n"] == 6
            assert payload["min_technology_score"] == 0
            assert payload["services"] == [self.service_design.name, self.service_backend.name]
        assert not ResultatMatching.objects.exists()

    @patch("matching.services.call_fastapi_matching")
    def test_matching_supports_freelance_without_services(self, mock_fastapi):
        self.freelance.services.clear()
        mock_fastapi.return_value = {"resultats": [], "etage_2_reussi": False}
        self.client.force_authenticate(user=self.user_freelance)
        response = self.client.get("/api/matching/missions-compatibilite/")
        assert response.status_code == 200
        assert mock_fastapi.call_args.args[0]["services"] == []

        self.client.force_authenticate(user=self.user_announcer1)
        response = self.client.post(f"/api/matching/candidats-recommandes/{self.mission.id}/")
        assert response.status_code == 200
        assert mock_fastapi.call_args.args[0]["candidats"][0]["services"] == []

        evaluer_matching_proactif(self.mission.id)
        assert mock_fastapi.call_count == 3
        assert mock_fastapi.call_args.args[0]["candidats"][0]["services"] == []

    def test_initial_compatibility_requires_freelance(self):
        url = "/api/matching/missions-compatibilite/"
        assert self.client.get(url).status_code == 401
        self.client.force_authenticate(user=self.user_announcer1)
        assert self.client.get(url).status_code == 403

    @patch("notification.services.get_channel_layer")
    @patch("matching.services.call_fastapi_matching")
    def test_evaluer_matching_proactif_single_grouped_llm_and_no_duplication(
        self, mock_fastapi, mock_channel_layer
    ):
        mock_channel_layer.return_value.group_send = AsyncMock()
        # Création d'un second freelance (David) qui aura un score < 80%
        user_freelance2 = User.objects.create_user(
            email="freelance2@jefly.com",
            password="Password123!",
            first_name="David",
            last_name="Junior",
            number_phone="0102030408",
            role=UserRole.FREELANCE,
            onboarding_completed=True,
        )
        freelance2 = Freelancee.objects.create(
            user=user_freelance2,
            title="Junior Dev",
            description="Débutant",
        )
        freelance2.services.add(self.service_design)

        # Mock pour Étage 1 (scoring_only=True) et Étage 2 (scoring_only=False)
        stage1_response = {
            "etage_2_reussi": False,
            "resultats": [
                {
                    "candidat_id": self.freelance.id,
                    "score": 0.85,
                    "score_technologies": 1.0,
                    "score_service": 1.0,
                    "score_experience": 0.4,
                    "justification_ia": None,
                },
                {
                    "candidat_id": freelance2.id,
                    "score": 0.50,
                    "score_technologies": 0.5,
                    "score_service": 1.0,
                    "score_experience": 0.0,
                    "justification_ia": None,
                },
            ],
        }

        stage2_response = {
            "etage_2_reussi": True,
            "resultats": [
                {
                    "candidat_id": self.freelance.id,
                    "score": 0.88,
                    "score_technologies": 1.0,
                    "score_service": 1.0,
                    "score_experience": 0.4,
                    "justification_ia": "Profil FastAPI très pertinent pour ce projet.",
                }
            ],
        }

        mock_fastapi.side_effect = [stage1_response, stage2_response]

        # 1er Appel du matching proactif
        evaluer_matching_proactif(self.mission.id)

        # Vérifier qu'il y a eu exactement 2 appels à FastAPI (1 scoring Stage 1 + 1 seul appel LLM groupé Stage 2)
        assert mock_fastapi.call_count == 2

        # Vérifier le payload du 1er appel (Stage 1)
        stage1_call_payload = mock_fastapi.call_args_list[0][0][0]
        assert stage1_call_payload["type_matching"] == "proactif"
        assert stage1_call_payload["scoring_only"] is True
        assert len(stage1_call_payload["candidats"]) == 2
        services_by_freelance = {c["id"]: c["services"] for c in stage1_call_payload["candidats"]}
        assert services_by_freelance[self.freelance.id] == [self.service_design.name, self.service_backend.name]
        assert services_by_freelance[freelance2.id] == [self.service_design.name]

        # Vérifier le payload du 2nd appel (Stage 2 - un seul appel groupé pour les freelances > 80%)
        stage2_call_payload = mock_fastapi.call_args_list[1][0][0]
        assert stage2_call_payload["type_matching"] == "proactif"
        assert stage2_call_payload["scoring_only"] is False
        assert len(stage2_call_payload["candidats"]) == 1
        assert stage2_call_payload["candidats"][0]["id"] == self.freelance.id
        assert stage2_call_payload["candidats"][0]["services"] == [self.service_design.name, self.service_backend.name]

        # Vérifier la création de la notification
        notifs = Notification.objects.filter(type="MISSION_RECOMMANDEE")
        assert notifs.count() == 1

        notif = notifs.first()
        assert notif.utilisateur == self.user_freelance
        assert notif.mission == self.mission
        assert notif.titre == "Une mission vous correspond à 88%"
        assert notif.message == "Profil FastAPI très pertinent pour ce projet."

        # Vérification Anti-doublon : réexécution de la tâche sur la même mission
        mock_fastapi.side_effect = [stage1_response, stage2_response]
        evaluer_matching_proactif(self.mission.id)

        # Le nombre de notifications reste 1 (aucun doublon créé)
        assert Notification.objects.filter(type="MISSION_RECOMMANDEE").count() == 1

    @patch("matching.services.call_fastapi_matching")
    def test_evaluer_matching_proactif_no_qualifying_stops_at_stage1(self, mock_fastapi):
        mock_fastapi.return_value = {
            "etage_2_reussi": False,
            "resultats": [
                {
                    "candidat_id": self.freelance.id,
                    "score": 0.65,
                    "score_technologies": 0.5,
                    "score_service": 1.0,
                    "score_experience": 0.4,
                    "justification_ia": None,
                }
            ],
        }

        evaluer_matching_proactif(self.mission.id)

        # Uniquement Stage 1 appelé, Stage 2 non appelé car score < 80%
        assert mock_fastapi.call_count == 1
        assert Notification.objects.filter(type="MISSION_RECOMMANDEE").count() == 0

    @patch("matching.services.lancer_matching_proactif_async")
    def test_mission_approval_triggers_proactive_matching(self, mock_lancer_async):
        self.mission.status = MissionStatus.PENDING_MODERATION
        self.mission.save()

        url = f"/api/missions/{self.mission.id}/moderation/"
        res = self.client.patch(url, {"decision": "approuver"}, format="json")

        assert res.status_code == status.HTTP_200_OK
        self.mission.refresh_from_db()
        assert self.mission.status == MissionStatus.OPEN
        mock_lancer_async.assert_called_once_with(self.mission.id)

