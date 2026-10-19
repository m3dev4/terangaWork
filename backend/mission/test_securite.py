"""
Tests des correctifs de sécurité issus de l'audit (octobre 2026) :
- modération fail-closed sans secret n8n ;
- génération de description robuste quand n8n est absent ou injoignable ;
- clé interne Django <-> FastAPI refusée si absente ou publique ;
- garde-fous de démarrage en production.
"""
import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import requests
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from Service.models import Service
from User.models import User, UserRole
from announcer.models import Announcer

from .models import Mission, MissionStatus

BACKEND_DIR = Path(__file__).resolve().parent.parent
SECRET = "secret-n8n-de-test-0123456789"


class BaseMission(APITestCase):
    def setUp(self):
        self.service = Service.objects.create(name="Développement web")
        self.annonceur = User.objects.create_user(
            email="annonceur@example.com", password="password123", role=UserRole.ANNONCEUR,
            first_name="A", last_name="B", number_phone="770000010",
        )
        self.profil = Announcer.objects.create(user=self.annonceur)
        self.mission = Mission.objects.create(
            annonceur=self.profil, title="Site vitrine", description="Un site.",
            date_deadline="2026-12-31", operateurMobileMoney="WAVE", budget=100000,
            service=self.service, status=MissionStatus.PENDING_MODERATION,
        )
        self.url = reverse("mission-moderation", args=[self.mission.pk])


class ModerationTests(BaseMission):
    @override_settings(N8N_MODERATION_SECRET="")
    def test_sans_secret_un_anonyme_est_refuse(self):
        res = self.client.patch(self.url, {"decision": "supprimer"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Mission.objects.filter(pk=self.mission.pk).exists())

    @override_settings(N8N_MODERATION_SECRET=SECRET)
    def test_mauvais_secret_refuse(self):
        res = self.client.patch(self.url, {"decision": "approuver"}, format="json",
                                HTTP_X_N8N_SECRET="faux")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(N8N_MODERATION_SECRET=SECRET)
    @patch("matching.services.lancer_matching_proactif_async")
    def test_bon_secret_accepte(self, _matching):
        res = self.client.patch(self.url, {"decision": "approuver"}, format="json",
                                HTTP_X_N8N_SECRET=SECRET)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.mission.refresh_from_db()
        self.assertEqual(self.mission.status, MissionStatus.OPEN)

    @override_settings(N8N_MODERATION_SECRET="")
    @patch("matching.services.lancer_matching_proactif_async")
    def test_admin_peut_moderer_sans_secret(self, _matching):
        admin = User.objects.create_user(
            email="admin@example.com", password="password123", first_name="Ad",
            last_name="Min", number_phone="770000011", is_staff=True,
        )
        self.client.force_authenticate(admin)
        res = self.client.patch(self.url, {"decision": "approuver"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class GenerationDescriptionTests(BaseMission):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.annonceur)
        self.gen_url = reverse("generate-description")

    @override_settings(N8N_DESCRIPTION_WEBHOOK_URL="")
    def test_non_configure_renvoie_503(self):
        res = self.client.post(self.gen_url, {"title": "App mobile"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @override_settings(N8N_DESCRIPTION_WEBHOOK_URL="https://n8n.example/webhook/x")
    @patch("mission.generateDescriptionView.requests.post", side_effect=requests.ConnectionError("down"))
    def test_n8n_injoignable_renvoie_502(self, _post):
        res = self.client.post(self.gen_url, {"title": "App mobile"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)

    @override_settings(N8N_DESCRIPTION_WEBHOOK_URL="https://n8n.example/webhook/x")
    @patch("mission.generateDescriptionView.requests.post")
    def test_reponse_liste_n8n_acceptee(self, post):
        post.return_value = MagicMock(ok=True, status_code=200, json=lambda: [{"description": "Texte"}])
        res = self.client.post(self.gen_url, {"title": "App mobile"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["description"], "Texte")


class CleInterneTests(APITestCase):
    url = "/api/chat/data/annonceur/missions/?user_id=1"

    @override_settings(FASTAPI_INTERNAL_API_KEY="dev-secret-internal-key")
    def test_ancienne_cle_publique_refusee(self):
        res = self.client.get(self.url, HTTP_X_INTERNAL_API_KEY="dev-secret-internal-key")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(FASTAPI_INTERNAL_API_KEY="")
    def test_cle_absente_refusee(self):
        res = self.client.get(self.url, HTTP_X_INTERNAL_API_KEY="")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class GardeFousProductionTests(APITestCase):
    """Le serveur doit refuser de démarrer en prod avec une configuration dangereuse."""

    def _demarrer(self, **env):
        base = {k: v for k, v in os.environ.items() if k not in (
            "DEBUG", "ALLOWED_HOSTS", "FASTAPI_INTERNAL_API_KEY", "N8N_MODERATION_SECRET",
            "PAYDUNYA_SIMULATE_DISBURSEMENT", "PAYDUNYA_MODE")}
        base.update({"SECRET_KEY": "x" * 50, "USE_SQLITE": "True", "DJANGO_SETTINGS_MODULE": "config.settings"})
        base.update(env)
        code = "import django; django.setup(); from django.conf import settings as s; print(s.PAYDUNYA_SIMULATE_DISBURSEMENT)"
        return subprocess.run([sys.executable, "-c", code], cwd=BACKEND_DIR, env=base,
                              capture_output=True, text=True, timeout=120)

    def test_prod_refuse_cle_publique(self):
        r = self._demarrer(DEBUG="False", ALLOWED_HOSTS="api.example.com",
                           FASTAPI_INTERNAL_API_KEY="dev-secret-internal-key",
                           N8N_MODERATION_SECRET=SECRET)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("FASTAPI_INTERNAL_API_KEY", r.stderr)

    def test_prod_refuse_joker_et_secret_absent(self):
        r = self._demarrer(DEBUG="False", ALLOWED_HOSTS="*", FASTAPI_INTERNAL_API_KEY="k" * 40)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("ALLOWED_HOSTS", r.stderr)
        self.assertIn("N8N_MODERATION_SECRET", r.stderr)

    def test_prod_correcte_demarre_et_simulation_forcee_off_en_live(self):
        r = self._demarrer(DEBUG="False", ALLOWED_HOSTS="api.example.com",
                           FASTAPI_INTERNAL_API_KEY="k" * 40, N8N_MODERATION_SECRET=SECRET,
                           PAYDUNYA_MODE="live", PAYDUNYA_SIMULATE_DISBURSEMENT="True")
        self.assertEqual(r.returncode, 0, r.stderr[-500:])
        self.assertEqual(r.stdout.strip().splitlines()[-1], "False")

    def test_simulation_desactivee_par_defaut(self):
        r = self._demarrer(DEBUG="True")
        self.assertEqual(r.returncode, 0, r.stderr[-500:])
        self.assertEqual(r.stdout.strip().splitlines()[-1], "False")
