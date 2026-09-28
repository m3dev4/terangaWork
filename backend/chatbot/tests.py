from unittest.mock import patch, MagicMock
from datetime import date, timedelta

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from User.models import User, UserRole
from freelance.models import Freelancee
from announcer.models import Announcer, TypeAnnouncer
from Service.models import Service
from Technologie.models import Technologie
from mission.models import Mission, MissionStatus, OperateurMobileMoneyType
from proposition.models import Proposition, PropositionStatus

from chatbot.models import ChatConversation, ChatMessage, ChatRole
from chatbot.services import ChatbotServiceUnavailableError


INTERNAL_KEY = "test-internal-key-12345"


@override_settings(
    FASTAPI_INTERNAL_API_KEY=INTERNAL_KEY,
    FASTAPI_MATCHING_URL="http://localhost:8000",
)
class ChatbotFrontendEndpointsTests(TestCase):
    """
    Tests sur les endpoints exposés au frontend React (authentification JWT).
    """

    @classmethod
    def setUpTestData(cls):
        cls.password = "SecurePass123!"
        cls.user_a = User.objects.create_user(
            email="alice@jefly.test",
            password=cls.password,
            first_name="Alice",
            last_name="Freelance",
            number_phone="+221770000001",
            role=UserRole.FREELANCE,
            onboarding_completed=True,
            is_verified=True,
        )
        cls.user_b = User.objects.create_user(
            email="bob@jefly.test",
            password=cls.password,
            first_name="Bob",
            last_name="Annonceur",
            number_phone="+221770000002",
            role=UserRole.ANNONCEUR,
            onboarding_completed=True,
            is_verified=True,
        )
        cls.freelance_profile = Freelancee.objects.create(
            user=cls.user_a,
            title="Développeur Backend",
            description="Spécialisé Django/FastAPI",
        )
        cls.announcer_profile = Announcer.objects.create(
            user=cls.user_b,
            typeAnnonceur=TypeAnnouncer.PARTICULIER,
        )

    def setUp(self):
        self.client = APIClient()

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    # ──────────────────────────────────────────────────────────
    # AC-5 : Isolation stricte entre utilisateurs
    # ──────────────────────────────────────────────────────────
    def test_conversation_ownership_forbidden_messages_403(self):
        """
        Un utilisateur NE DOIT PAS pouvoir lire les messages
        d'une conversation qui ne lui appartient pas.
        """
        conv_owner = ChatConversation.objects.create(
            owner=self.user_a, title="Conversation privée d'Alice"
        )
        ChatMessage.objects.create(
            conversation=conv_owner,
            role=ChatRole.UTILISATEUR,
            content="Secret d'Alice",
        )

        self._auth_as(self.user_b)
        url = reverse("chatbot:chat-conversation-messages", args=[conv_owner.pk])
        res = self.client.get(url)

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("appartient pas", str(res.data.get("detail", "")))

    def test_conversation_ownership_forbidden_delete_403(self):
        """
        Un utilisateur NE DOIT PAS pouvoir supprimer une conversation
        qui ne lui appartient pas.
        """
        conv_owner = ChatConversation.objects.create(
            owner=self.user_a, title="Conversation Alice"
        )

        self._auth_as(self.user_b)
        url = reverse("chatbot:chat-conversation-detail", args=[conv_owner.pk])
        res = self.client.delete(url)

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        # La conversation existe toujours
        self.assertTrue(
            ChatConversation.objects.filter(pk=conv_owner.pk).exists()
        )

    def test_conversation_ownership_forbidden_send_403(self):
        """
        Un utilisateur NE DOIT PAS pouvoir poster un message
        dans une conversation qui ne lui appartient pas.
        """
        conv_owner = ChatConversation.objects.create(
            owner=self.user_a, title="Conversation Alice"
        )

        self._auth_as(self.user_b)
        url = reverse("chatbot:chat-send-message", args=[conv_owner.pk])
        res = self.client.post(url, {"content": "Message pirate"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ──────────────────────────────────────────────────────────
    # Validation du contenu et longueur des messages
    # ──────────────────────────────────────────────────────────
    def test_message_too_long_rejected_400(self):
        """
        Un message de plus de 2000 caractères doit être rejeté
        par le serializer AVANT tout appel à FastAPI.
        """
        conv = ChatConversation.objects.create(owner=self.user_a)
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])

        oversized = "A" * 2001
        res = self.client.post(url, {"content": oversized}, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # Aucun message n'a été enregistré
        self.assertEqual(
            ChatMessage.objects.filter(conversation=conv).count(), 0
        )

    def test_message_empty_stripped_rejected_400(self):
        """
        Un message vide ou seulement des espaces est rejeté.
        """
        conv = ChatConversation.objects.create(owner=self.user_a)
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])

        res = self.client.post(url, {"content": "   \n\t  "}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # ──────────────────────────────────────────────────────────
    # AC-6 : Panne FastAPI → AUCUNE réponse assistant enregistrée
    # ──────────────────────────────────────────────────────────
    def test_fastapi_unavailable_no_assistant_message_saved(self):
        """
        Si FastAPI est indisponible (ChatbotServiceUnavailableError),
        on retourne HTTP 503 et on N'ENREGISTRE AUCUN message assistant
        (pour éviter d'inventer une réponse).
        """
        conv = ChatConversation.objects.create(owner=self.user_a)
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])

        with patch("chatbot.views.call_fastapi_chat") as mock_call:
            mock_call.side_effect = ChatbotServiceUnavailableError(
                "Timeout FastAPI"
            )
            res = self.client.post(
                url, {"content": "Ma question"}, format="json"
            )

        self.assertEqual(
            res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE
        )
        # Seul le message utilisateur est présent
        msgs = list(
            ChatMessage.objects.filter(conversation=conv).order_by(
                "created_at"
            )
        )
        self.assertEqual(len(msgs), 1)
        self.assertEqual(msgs[0].role, ChatRole.UTILISATEUR)
        # Champ détail présent pour le frontend
        self.assertIn("temporairement indisponible", str(res.data["detail"]))

    def test_fastapi_returns_erreur_field_no_assistant_message(self):
        """
        Si FastAPI renvoie {"erreur": ...} (HF down par exemple),
        on retourne 503 et on ne sauvegarde pas de message assistant.
        """
        conv = ChatConversation.objects.create(owner=self.user_a)
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])

        with patch("chatbot.views.call_fastapi_chat") as mock_call:
            mock_call.return_value = {
                "erreur": "hf_indisponible",
                "message_user_fr": "Modèle IA temporairement hors service.",
                "reponse": None,
            }
            res = self.client.post(
                url, {"content": "Question"}, format="json"
            )

        self.assertEqual(
            res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE
        )
        assistant_count = ChatMessage.objects.filter(
            conversation=conv, role=ChatRole.ASSISTANT
        ).count()
        self.assertEqual(assistant_count, 0)

    # ──────────────────────────────────────────────────────────
    # AC-3 : Ambiguïté → precision_demandée transmis au frontend
    # ──────────────────────────────────────────────────────────
    def test_ambiguite_missions_similaires_returns_precision_flag(self):
        """
        Quand FastAPI détecte plusieurs missions correspondant à la question,
        il renvoie precision_demandee=True. Django DOIT transmettre ce flag
        au frontend ET enregistrer la réponse (liste des missions) comme
        message assistant légitime (pas une erreur).
        """
        conv = ChatConversation.objects.create(owner=self.user_a)
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])

        precision_response = (
            "Plusieurs missions correspondent à votre demande :\n"
            "1. Développeur Backend Django (ID #12)\n"
            "2. Développeur Backend FastAPI (ID #13)\n"
            "Merci de préciser laquelle vous intéresse."
        )

        with patch("chatbot.views.call_fastapi_chat") as mock_call:
            mock_call.return_value = {
                "reponse": precision_response,
                "precision_demandee": True,
                "ambiguite_detectee": True,
                "erreur": None,
            }
            res = self.client.post(
                url,
                {"content": "Où en est ma mission développeur backend ?"},
                format="json",
            )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("precision_demandee"))
        # La réponse d'ambiguïté est bien enregistrée comme message assistant
        assistant_msgs = ChatMessage.objects.filter(
            conversation=conv, role=ChatRole.ASSISTANT
        )
        self.assertEqual(assistant_msgs.count(), 1)
        self.assertIn(
            "Plusieurs missions correspondent", assistant_msgs.first().content
        )

    # ──────────────────────────────────────────────────────────
    # Flux basique : créer → lister → envoyer → supprimer
    # ──────────────────────────────────────────────────────────
    def test_create_list_and_delete_conversation_flow(self):
        """
        Test complet : créer une conversation, vérifier qu'elle
        apparaît dans la liste du propriétaire, puis la supprimer.
        """
        self._auth_as(self.user_a)

        # Créer
        create_url = reverse("chatbot:chat-conversation-list")
        res = self.client.post(create_url, {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        conv_id = res.data["id"]

        # Vérifier présence dans la liste
        list_res = self.client.get(create_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in list_res.data]
        self.assertIn(conv_id, ids)

        # Supprimer
        delete_url = reverse(
            "chatbot:chat-conversation-detail", args=[conv_id]
        )
        del_res = self.client.delete(delete_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            ChatConversation.objects.filter(pk=conv_id).exists()
        )

    def test_title_auto_generated_from_first_message(self):
        """
        Si la conversation n'a pas de titre, il est auto-généré
        à partir des 50 premiers caractères du 1er message utilisateur.
        """
        conv = ChatConversation.objects.create(owner=self.user_a, title="")
        self._auth_as(self.user_a)
        url = reverse("chatbot:chat-send-message", args=[conv.pk])
        first_msg = (
            "Comment améliorer mon profil freelance pour obtenir plus de missions "
            "dans le domaine du web ?"
        )

        with patch("chatbot.views.call_fastapi_chat") as mock_call:
            mock_call.return_value = {
                "reponse": "Voici quelques conseils…",
                "precision_demandee": False,
            }
            self.client.post(url, {"content": first_msg}, format="json")

        conv.refresh_from_db()
        self.assertTrue(len(conv.title) > 0)
        self.assertLessEqual(len(conv.title), 53)  # 50 + "..."
        self.assertEqual(conv.title[:30], first_msg[:30])


# ──────────────────────────────────────────────────────────────
# Tests des endpoints MÉTIERS INTERNES (IsInternalService)
# Accessibles uniquement par FastAPI, header X-Internal-API-Key
# ──────────────────────────────────────────────────────────────
@override_settings(
    FASTAPI_INTERNAL_API_KEY=INTERNAL_KEY,
    FASTAPI_MATCHING_URL="http://localhost:8000",
)
class ChatbotInternalDataEndpointsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "SecurePass123!"
        cls.freelance_user = User.objects.create_user(
            email="flora@jefly.test",
            password=cls.password,
            first_name="Flora",
            last_name="Dev",
            number_phone="+221770000003",
            role=UserRole.FREELANCE,
            onboarding_completed=True,
            is_verified=True,
        )
        cls.freelance_profile = Freelancee.objects.create(
            user=cls.freelance_user,
            title="Développeuse Fullstack",
            description="Django + React",
        )
        # 2e freelance pour vérifier isolation
        cls.freelance_user_2 = User.objects.create_user(
            email="farid@jefly.test",
            password=cls.password,
            first_name="Farid",
            last_name="DevOps",
            number_phone="+221770000004",
            role=UserRole.FREELANCE,
            onboarding_completed=True,
            is_verified=True,
        )
        Freelancee.objects.create(
            user=cls.freelance_user_2,
            title="DevOps",
            description="K8s, CI/CD",
        )
        # Annonceur + missions
        cls.annonceur_user = User.objects.create_user(
            email="ama@jefly.test",
            password=cls.password,
            first_name="Ama",
            last_name="CEO",
            number_phone="+221770000005",
            role=UserRole.ANNONCEUR,
            onboarding_completed=True,
            is_verified=True,
        )
        cls.announcer_profile = Announcer.objects.create(
            user=cls.annonceur_user, typeAnnonceur=TypeAnnouncer.ENTREPRISE, company_name="TechCorp"
        )
        svc = Service.objects.create(name="Développement Web", description="Dev")
        cls.mission_backend_1 = Mission.objects.create(
            title="Développeur Backend Django",
            description="API Django REST",
            budget=300000,
            service=svc,
            annonceur=cls.announcer_profile,
            status=MissionStatus.OPEN,
            operateurMobileMoney=OperateurMobileMoneyType.WAVE,
            date_deadline=date.today() + timedelta(days=30),
        )
        cls.mission_backend_2 = Mission.objects.create(
            title="Développeur Backend FastAPI",
            description="API FastAPI async",
            budget=250000,
            service=svc,
            annonceur=cls.announcer_profile,
            status=MissionStatus.OPEN,
            operateurMobileMoney=OperateurMobileMoneyType.OM,
            date_deadline=date.today() + timedelta(days=45),
        )
        # Proposition freelance 1 sur mission 1
        cls.prop_flora = Proposition.objects.create(
            freelance=cls.freelance_profile,
            mission=cls.mission_backend_1,
            lettre_motivation="Je maîtrise Django parfaitement.",
            date_livraison=date.today() + timedelta(days=20),
            proposition_status=PropositionStatus.PENDING,
        )

    def setUp(self):
        self.client = APIClient()

    def _internal_headers(self):
        return {"X-Internal-API-Key": INTERNAL_KEY}

    # ──────────────────────────────────────────────────────────
    # Accès sans clé interne : 401/403 (permission refusée)
    # ──────────────────────────────────────────────────────────
    def test_internal_endpoint_forbidden_without_api_key(self):
        """
        Un endpoint /chat/data/* SANS le header X-Internal-API-Key
        est rejeté d'office.
        """
        url = (
            reverse("chatbot:chat-data-freelance-propositions")
            + f"?user_id={self.freelance_user.pk}"
        )
        res = self.client.get(url)
        self.assertIn(
            res.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_internal_endpoint_forbidden_wrong_api_key(self):
        """
        Même principe avec une MAUVAISE clé.
        """
        url = (
            reverse("chatbot:chat-data-freelance-propositions")
            + f"?user_id={self.freelance_user.pk}"
        )
        res = self.client.get(
            url, headers={"X-Internal-API-Key": "mauvaise-cle"}
        )
        self.assertIn(
            res.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    # ──────────────────────────────────────────────────────────
    # AC-1 : Isolation freelance → SEULEMENT ses propres propositions
    # ──────────────────────────────────────────────────────────
    def test_freelance_endpoint_returns_only_own_propositions(self):
        """
        /data/freelance/propositions/?user_id=FLORA doit renvoyer
        LES SEULES propositions de Flora, PAS celles de Farid.
        """
        # Ajouter une proposition à Farid sur mission 2
        farid_profile = Freelancee.objects.get(user=self.freelance_user_2)
        Proposition.objects.create(
            freelance=farid_profile,
            mission=self.mission_backend_2,
            lettre_motivation="Je suis DevOps.",
            date_livraison=date.today() + timedelta(days=15),
            proposition_status=PropositionStatus.PENDING,
        )

        url = reverse("chatbot:chat-data-freelance-propositions")
        res = self.client.get(
            url
            + f"?user_id={self.freelance_user.pk}",
            headers=self._internal_headers(),
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        props = res.json().get("propositions", [])
        self.assertEqual(len(props), 1)
        self.assertEqual(
            props[0]["mission"]["title"], self.mission_backend_1.title
        )
        # La mission de Farid ne doit PAS apparaître
        titres = [p["mission"]["title"] for p in props]
        self.assertNotIn(self.mission_backend_2.title, titres)

    # ──────────────────────────────────────────────────────────
    # AC-2 : Rôle croisé interdit → 403
    # ──────────────────────────────────────────────────────────
    def test_freelance_accessing_annonceur_data_403(self):
        """
        Un utilisateur ayant le rôle ANNONCEUR appelant un endpoint
        FREELANCE doit recevoir 403 (access_denied_role).
        """
        url = reverse("chatbot:chat-data-freelance-propositions")
        res = self.client.get(
            url + f"?user_id={self.annonceur_user.pk}",
            headers=self._internal_headers(),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(res.json().get("access_denied_role"))

    def test_annonceur_endpoint_access_denied_freelance_403(self):
        """
        Inverse : un freelance sur /data/annonceur/missions → 403.
        """
        url = reverse("chatbot:chat-data-annonceur-missions")
        res = self.client.get(
            url + f"?user_id={self.freelance_user.pk}",
            headers=self._internal_headers(),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(res.json().get("access_denied_role"))

    # ──────────────────────────────────────────────────────────
    # AC-7 : Role/User_id DANS LE TEXTE ignoré (payload fait foi)
    # Vérifié ici par le fait que seul le user_id query param compte
    # Quelque soit la "question" envoyée, la payload est construite
    # par Django depuis request.user.id, jamais depuis le texte.
    # On valide donc que le endpoint retourne 404 sur user_id invalide.
    # ──────────────────────────────────────────────────────────
    def test_internal_endpoint_user_id_missing_or_invalid(self):
        """
        Sans user_id valide (entier), le endpoint renvoie 400 ou 404,
        jamais de données. Garantit qu'aucune donnée n'est renvoyée
        sans id précis issu de l'authentification Django.
        """
        url = reverse("chatbot:chat-data-freelance-propositions")
        # Sans param
        res_no_param = self.client.get(url, headers=self._internal_headers())
        self.assertEqual(
            res_no_param.status_code, status.HTTP_400_BAD_REQUEST
        )
        # user_id = chaîne non numérique
        res_bad = self.client.get(
            url + "?user_id=mauvais", headers=self._internal_headers()
        )
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        # user_id = 99999 (n'existe pas)
        res_ghost = self.client.get(
            url + "?user_id=99999", headers=self._internal_headers()
        )
        self.assertEqual(res_ghost.status_code, status.HTTP_404_NOT_FOUND)

    # ──────────────────────────────────────────────────────────
    # Annonceur : ownership de la mission
    # ──────────────────────────────────────────────────────────
    def test_annonceur_mission_candidatures_ownership_403(self):
        """
        Un annonceur NE PEUT PAS consulter les candidatures d'une mission
        qui ne lui appartient PAS via /mission/<id>/candidatures/.
        """
        # Créer un 2e annonceur + sa mission
        other_ann_user = User.objects.create_user(
            email="autre@jefly.test",
            password=self.password,
            first_name="Autre",
            last_name="Annonceur",
            number_phone="+221770000006",
            role=UserRole.ANNONCEUR,
            onboarding_completed=True,
        )
        other_ann = Announcer.objects.create(
            user=other_ann_user, typeAnnonceur=TypeAnnouncer.PARTICULIER
        )
        svc = Service.objects.first()
        mission_autre = Mission.objects.create(
            title="Mission d'un autre annonceur",
            description="Privée",
            budget=500000,
            service=svc,
            annonceur=other_ann,
            status=MissionStatus.OPEN,
            operateurMobileMoney=OperateurMobileMoneyType.WAVE,
        )

        url = reverse(
            "chatbot:chat-data-annonceur-mission-candidatures",
            args=[mission_autre.pk],
        )
        # Appeler EN TANT QU'Announcer AMA (pas owner)
        res = self.client.get(
            url + f"?user_id={self.annonceur_user.pk}",
            headers=self._internal_headers(),
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ──────────────────────────────────────────────────────────
    # AC-8 : Recommandations appelent bien le service de matching
    # ──────────────────────────────────────────────────────────
    def test_annonceur_recommandations_appelle_matching_service(self):
        """
        /data/annonceur/mission/<id>/recommandations/ appelle bien
        process_candidats_recommandes() et renvoie son résultat.
        """
        url = reverse(
            "chatbot:chat-data-annonceur-mission-recommandations",
            args=[self.mission_backend_1.pk],
        )
        fake_recommandations = {
            "resultats": [
                {
                    "freelance_id": self.freelance_profile.pk,
                    "freelance_nom": "Flora Dev",
                    "proposition_id": self.prop_flora.pk,
                    "score": 0.87,
                    "justification_ia": "Match techno + service",
                }
            ],
            "etage_2_reussi": True,
        }
        with patch(
            "chatbot.data_views.process_candidats_recommandes"
        ) as mock_matching:
            mock_matching.return_value = fake_recommandations
            res = self.client.get(
                url + f"?user_id={self.annonceur_user.pk}",
                headers=self._internal_headers(),
            )

        mock_matching.assert_called_once_with(self.mission_backend_1)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(len(data.get("resultats", [])), 1)
        self.assertEqual(
            data["resultats"][0]["freelance_id"],
            self.freelance_profile.pk,
        )

    def test_annonceur_recommandations_matching_down_503_but_empty(self):
        """
        Si le service matching est down, renvoyer 503 + resultats=[].
        """
        from matching.services import MatchingServiceUnavailableError

        url = reverse(
            "chatbot:chat-data-annonceur-mission-recommandations",
            args=[self.mission_backend_1.pk],
        )
        with patch(
            "chatbot.data_views.process_candidats_recommandes"
        ) as mock_matching:
            mock_matching.side_effect = MatchingServiceUnavailableError(
                "FastAPI down"
            )
            res = self.client.get(
                url + f"?user_id={self.annonceur_user.pk}",
                headers=self._internal_headers(),
            )
        self.assertEqual(
            res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE
        )
        self.assertEqual(res.json().get("resultats"), [])
