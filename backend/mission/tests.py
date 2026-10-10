from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from Service.models import Service
from User.models import User, UserRole
from announcer.models import Announcer

from .models import Mission, MissionStatus


class MissionViewSetTests(APITestCase):
    def setUp(self):
        webhook = patch("mission.views.send_n8n_moderation_webhook")
        webhook.start()
        self.addCleanup(webhook.stop)
        self.service = Service.objects.create(name="Développement web")
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="password123",
            role=UserRole.ANNONCEUR,
            first_name="Owner",
            last_name="Annonceur",
            number_phone="770000000",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="password123",
            role=UserRole.ANNONCEUR,
            first_name="Other",
            last_name="Annonceur",
            number_phone="771111111",
        )
        self.owner_profile = Announcer.objects.create(user=self.owner)
        self.other_profile = Announcer.objects.create(user=self.other_user)
        self.list_url = reverse("mission-list")

    def mission_payload(self):
        return {
            "title": "Créer une application",
            "description": "Développer une application web complète.",
            "date_deadline": "2026-12-31",
            "operateurMobileMoney": "WAVE",
            "budget": 500000,
            "service": self.service.pk,
        }

    def test_annonceur_can_create_and_manage_own_mission(self):
        self.client.force_authenticate(self.owner)

        response = self.client.post(
            self.list_url, self.mission_payload(), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mission = Mission.objects.get(pk=response.data["id"])
        self.assertEqual(mission.annonceur, self.owner_profile)

        detail_url = reverse("mission-detail", args=[mission.pk])
        response = self.client.patch(
            detail_url, {"title": "Application mobile"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Application mobile")

        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_annonceur_ne_peut_pas_acceder_aux_missions_d_un_autre(self):
        payload = self.mission_payload()
        payload["service"] = self.service
        mission = Mission.objects.create(
            annonceur=self.owner_profile,
            **payload,
        )
        self.client.force_authenticate(self.other_user)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

        detail_url = reverse("mission-detail", args=[mission.pk])
        response = self.client.patch(
            detail_url, {"title": "Modification interdite"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_un_freelance_ne_peut_pas_creer_de_mission(self):
        freelance = User.objects.create_user(
            email="freelance@example.com",
            password="password123",
            role=UserRole.FREELANCE,
            first_name="Freelance",
            last_name="User",
            number_phone="772222222",
        )
        self.client.force_authenticate(freelance)

        response = self.client.post(
            self.list_url, self.mission_payload(), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_un_freelance_peut_lire_la_liste_et_le_detail_des_missions(self):
        payload = self.mission_payload()
        payload["service"] = self.service
        mission = Mission.objects.create(
            annonceur=self.owner_profile,
            status=MissionStatus.OPEN,
            **payload,
        )
        freelance = User.objects.create_user(
            email="reader@example.com",
            password="password123",
            role=UserRole.FREELANCE,
            first_name="Reader",
            last_name="Freelance",
            number_phone="773333333",
        )
        self.client.force_authenticate(freelance)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], mission.pk)

        response = self.client.get(reverse("mission-detail", args=[mission.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], mission.title)

        response = self.client.patch(
            reverse("mission-detail", args=[mission.pk]),
            {"title": "Modification interdite"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.delete(reverse("mission-detail", args=[mission.pk]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_budget_minimum_on_creation(self):
        self.client.force_authenticate(self.owner)
        for budget in (-1, 0, 9999, 10000, 10001):
            with self.subTest(budget=budget):
                payload = {**self.mission_payload(), "budget": budget}
                response = self.client.post(self.list_url, payload, format="json")
                self.assertEqual(response.status_code, 400 if budget < 10000 else 201)
                if budget < 10000:
                    self.assertIn("budget", response.data)
        self.assertEqual(Mission.objects.count(), 2)

    def test_budget_cannot_be_lowered_below_minimum(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.list_url, self.mission_payload(), format="json")
        url = reverse("mission-detail", args=[response.data["id"]])
        response = self.client.patch(url, {"budget": 9999}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("budget", response.data)
        self.assertEqual(Mission.objects.get().budget, 500000)

# Create your tests here.
