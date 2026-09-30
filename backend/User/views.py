"""
AuthViewSet - Orchestration des flux d'authentification.

Ce ViewSet gère les 5 actions d'authentification pré-connexion :
- register : inscription d'un nouvel utilisateur + envoi OTP
- verify-email : vérification du code OTP et activation du compte
- login : authentification email/mot de passe + émission JWT
- password-reset : demande de réinitialisation (envoi lien par email)
- new-password : confirmation de réinitialisation (nouveau mot de passe)

Toute la logique de validation métier est déléguée aux serializers.
L'envoi d'emails est délégué au service email_service.
Ce ViewSet ne fait qu'orchestrer le flux HTTP et la persistance.
"""

from rest_framework.decorators import permission_classes
import logging
import random
from datetime import timedelta

from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import BasePermission

from .email_service import send_otp_email, send_password_reset_email
from .models import User, optCode, session
from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    SessionSerializer,
    VerifyEmailSerializer,
    ProfileSerializer,
    UpdateProfileSerializer,
    DeleteProfileSerializer,
    RoleSelectionSerializer,
)

logger = logging.getLogger(__name__)


class AuthViewSet(viewsets.ViewSet):
    """
    ViewSet d'authentification gérant les flux pré-connexion et la gestion des sessions.

    Actions publiques (AllowAny) :
        - register (POST) : inscription + envoi OTP
        - verify-email (POST) : vérification OTP + activation compte
        - login (POST) : authentification + tokens JWT + création session
        - password-reset (POST) : demande réinitialisation + envoi lien
        - new-password (POST) : confirmation réinitialisation + mise à jour mot de passe

    Actions protégées (IsAuthenticated) :
        - get-all-sessions (GET) : liste des sessions actives de l'utilisateur
    """

    permission_classes = [AllowAny]

    @action(
        detail=False,
        methods=["post"],
        url_path="select-role",
        permission_classes=[IsAuthenticated],
    )
    def select_role(self, request):
        """Choisit définitivement le rôle freelance ou annonceur de l'utilisateur."""
        if not request.user.is_verified:
            return Response(
                {"detail": "Le compte doit être vérifié avant de choisir un rôle."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RoleSelectionSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.role = serializer.validated_data["role"]
        request.user.save(update_fields=["role"])

        return Response(
            {
                "message": "Votre rôle a été enregistré définitivement.",
                "role": request.user.role,
            },
            status=status.HTTP_200_OK,
        )

    def _generate_otp_code(self) -> str:
        """Génère un code OTP à 6 chiffres."""
        return f"{random.randint(100000, 999999):06d}"

    def _create_otp_code(self, user: User) -> optCode:
        """
        Crée et persiste un code OTP pour l'utilisateur.

        Invalide les codes précédents non utilisés du même utilisateur.
        """
        # Invalider les anciens codes non utilisés
        optCode.objects.filter(user=user, is_used=False).update(is_used=True)

        # Créer le nouveau code
        otp_code = self._generate_otp_code()
        expiration = timezone.now() + timedelta(minutes=10)

        return optCode.objects.create(
            user=user,
            code=otp_code,
            code_expiration=expiration,
            is_used=False,
        )

    @action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        """
        Inscription d'un nouvel utilisateur.

        POST /api/auth/register/

        Payload attendu :
            {
                "email": "user@example.com",
                "password": "MotDePasse123!",
                "confirmPassword": "MotDePasse123!"
            }

        Réponses :
            - 201 : Inscription réussie, email de vérification envoyé
            - 400 : Erreurs de validation (email existant, mot de passe faible, etc.)
            - 500 : Erreur interne (ex: échec envoi email, mais compte créé)
        """
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Créer l'utilisateur (is_verified=False par défaut via AbstractUser)
        user = serializer.save()
        user.is_verified = False
        user.save(update_fields=["is_verified"])

        # Générer et persister le code OTP
        otp_obj = self._create_otp_code(user)

        # Envoyer l'email OTP
        email_result = send_otp_email(user.email, otp_obj.code)

        if not email_result["success"]:
            logger.error(
                "Échec envoi email OTP pour %s: %s",
                user.email,
                email_result["error"],
            )
            # Le compte est créé mais l'email a échoué
            # On informe l'utilisateur qu'il pourra demander un renvoi
            return Response(
                {
                    "message": (
                        "Inscription réussie. L'envoi de l'email de vérification a "
                        "échoué. Vous pourrez demander un nouveau code plus tard."
                    )
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "message": "Inscription réussie. Vérifiez votre email pour le code de vérification."
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="verify-email")
    def verify_email(self, request):
        """
        Vérification du code OTP et activation du compte.

        POST /api/auth/verify-email/

        Payload attendu :
            {
                "code": "123456"
            }

        Contexte requis : l'email doit être fourni dans la requête
        (ex: via header X-Verification-Email ou dans le body).

        Réponses :
            - 200 : Email vérifié, compte activé
            - 400 : Code invalide, expiré, déjà utilisé ou email manquant
        """
        # Récupérer l'email depuis le body ou un header
        email = request.data.get("email") or request.headers.get("X-Verification-Email")

        if not email:
            return Response(
                {"error": "L'email est requis pour vérifier le code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = VerifyEmailSerializer(
            data=request.data, context={"email": email.strip().lower()}
        )
        serializer.is_valid(raise_exception=True)

        # Récupérer le code valide (déjà validé par le serializer)
        code = serializer.validated_data["code"]
        otp_obj = (
            optCode.objects.filter(
                user__email__iexact=email,
                code=code,
                is_used=False,
                code_expiration__gt=timezone.now(),
            )
            .order_by("-date_created")
            .first()
        )

        if otp_obj is None:
            return Response(
                {"error": "Code de vérification invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Marquer le code comme utilisé
        otp_obj.is_used = True
        otp_obj.save(update_fields=["is_used"])

        # Activer l'utilisateur
        user = otp_obj.user
        user.is_verified = True
        user.save(update_fields=["is_verified"])

        return Response(
            {
                "message": "Email vérifié avec succès. Votre compte est maintenant actif."
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        """
        Authentification email + mot de passe + création de session.

        POST /api/auth/login/

        Payload attendu :
            {
                "email": "user@example.com",
                "password": "MotDePasse123!"
            }

        Réponses :
            - 200 : Authentification réussie, tokens JWT retournés, session créée
            - 401 : Identifiants invalides ou compte non activé
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Créer une session liée au token JWT
        # Calculer l'expiration du token à partir de la durée de vie du refresh token
        from django.conf import settings
        from datetime import timedelta

        refresh_lifetime = getattr(settings, "SIMPLE_JWT", {}).get(
            "REFRESH_TOKEN_LIFETIME", timedelta(days=7)
        )
        token_expiration = timezone.now() + refresh_lifetime

        # Extraire device et location depuis la requête
        device = request.META.get("HTTP_USER_AGENT", "")[:255]
        # Location peut être dérivée de l'IP (simplifié ici)
        location = request.META.get("REMOTE_ADDR", "")

        session_data = {
            "token": refresh_token,  # On stocke le refresh token comme identifiant de session
            "device": device,
            "location": location,
            "token_expiration": token_expiration,
        }

        # Créer le serializer avec l'utilisateur dans le contexte
        session_serializer = SessionSerializer(
            data=session_data, context={"request": request}
        )
        session_serializer.is_valid(raise_exception=True)
        # Forcer l'utilisateur sur l'instance avant de sauvegarder
        # (CurrentUserDefault renvoie AnonymousUser pendant le login)
        session_serializer.save(user=user)

        return Response(
            {
                "message": "Connexion réussie.",
                "access": access_token,
                "refresh": refresh_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="password-reset")
    def password_reset(self, request):
        """
        Demande de réinitialisation de mot de passe.

        POST /api/auth/password-reset/

        Payload attendu :
            {
                "email": "user@example.com"
            }

        Réponses :
            - 200 : Si l'email existe, un lien a été envoyé (réponse identique
                    même si l'email n'existe pas - anti-énumération)
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        # Vérifier si l'utilisateur existe (sans révéler l'information)
        user = User.objects.filter(email__iexact=email).first()

        if user:
            # Générer uidb64 et token
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Construire le lien de réinitialisation
            # Note: l'URL frontend doit être configurée via variable d'environnement
            from decouple import config

            frontend_url = config("FRONTEND_URL", default="http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password/{uidb64}/{token}/"

            # Envoyer l'email
            email_result = send_password_reset_email(user.email, reset_link)

            if not email_result["success"]:
                logger.error(
                    "Échec envoi email réinitialisation pour %s: %s",
                    user.email,
                    email_result["error"],
                )
                # On ne fait pas échouer la requête pour ne pas révéler l'existence du compte

        # Réponse identique que l'utilisateur existe ou non (anti-énumération)
        return Response(
            {
                "message": (
                    "Si un compte existe avec cet email, un lien de réinitialisation "
                    "a été envoyé."
                )
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="new-password")
    def new_password(self, request):
        """
        Confirmation de réinitialisation de mot de passe.

        POST /api/auth/new-password/

        Paramètres URL (query params) :
            - uidb64 : identifiant utilisateur encodé
            - token : token de réinitialisation

        Payload attendu :
            {
                "newPassword": "NouveauMotDePasse123!",
                "confirmPassword": "NouveauMotDePasse123!"
            }

        Réponses :
            - 200 : Mot de passe mis à jour avec succès
            - 400 : Token invalide/expiré ou erreurs de validation du mot de passe
        """
        # Récupérer uidb64 et token depuis les query params
        uidb64 = request.query_params.get("uidb64")
        token = request.query_params.get("token")

        if not uidb64 or not token:
            return Response(
                {"error": "Paramètres uidb64 et token requis dans l'URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Décoder l'uid et récupérer l'utilisateur
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Lien de réinitialisation invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérifier le token
        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": "Lien de réinitialisation invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valider le nouveau mot de passe
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Mettre à jour le mot de passe
        user.set_password(serializer.validated_data["newPassword"])
        user.save(update_fields=["password"])

        # Optionnel: invalider les sessions existantes, tokens, etc.
        # Ici on se contente de la mise à jour du mot de passe

        return Response(
            {"message": "Mot de passe réinitialisé avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="get-all-sessions",
        permission_classes=[IsAuthenticated],
    )
    def get_all_sessions(self, request):
        """
        Liste des sessions actives de l'utilisateur connecté.

        GET /api/auth/get-all-sessions/

        Réponses :
            - 200 : Liste des sessions actives (peut être vide)
            - 401 : Non authentifié
        """
        # Récupérer les sessions actives de l'utilisateur, triées par date_last_used décroissant
        active_sessions = session.objects.filter(
            user=request.user, is_active=True
        ).order_by("-date_last_used")

        # Sérialiser sans exposer le token (write_only=True dans le serializer)
        serializer = SessionSerializer(active_sessions, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        url_path="change-password",
        permission_classes=[IsAuthenticated],
    )
    def change_password(self, request):
        """
        Changement de mot de passe de l'utilisateur connecté.

        POST /api/auth/change-password/

        Payload attendu :
            {
                "old_password": "AncienMdp123!",
                "new_password": "NouveauMdp456!"
            }

        Réponses :
            - 200 : Mot de passe modifié avec succès
            - 400 : Ancien mot de passe incorrect ou nouveau mot de passe invalide
            - 401 : Non authentifié
        """
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"error": "L'ancien et le nouveau mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(old_password):
            return Response(
                {"error": "L'ancien mot de passe est incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, request.user)
        except DjangoValidationError as e:
            return Response(
                {"error": e.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])

        return Response(
            {"message": "Mot de passe modifié avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="revoke-session",
        permission_classes=[IsAuthenticated],
    )
    def revoke_session(self, request):
        """
        Révoque (désactive) une session spécifique de l'utilisateur connecté.

        POST /api/auth/revoke-session/

        Payload attendu :
            {
                "session_id": 42
            }

        Réponses :
            - 200 : Session révoquée
            - 400 : session_id manquant
            - 404 : Session non trouvée
        """
        session_id = request.data.get("session_id")
        if not session_id:
            return Response(
                {"error": "L'identifiant de la session est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_session = session.objects.get(
                id=session_id, user=request.user, is_active=True
            )
        except session.DoesNotExist:
            return Response(
                {"error": "Session introuvable ou déjà révoquée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_session.is_active = False
        target_session.save(update_fields=["is_active"])

        return Response(
            {"message": "Session révoquée avec succès."},
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="revoke-all-other-sessions",
        permission_classes=[IsAuthenticated],
    )
    def revoke_all_other_sessions(self, request):
        """
        Révoque toutes les sessions actives de l'utilisateur sauf la session courante.

        POST /api/auth/revoke-all-other-sessions/

        La session courante est identifiée par le refresh_token envoyé dans le body.

        Payload attendu :
            {
                "current_refresh_token": "eyJ..."
            }

        Réponses :
            - 200 : Toutes les autres sessions révoquées
            - 401 : Non authentifié
        """
        current_token = request.data.get("current_refresh_token", "")

        revoked_count = session.objects.filter(
            user=request.user, is_active=True
        ).exclude(token=current_token).update(is_active=False)

        return Response(
            {
                "message": f"{revoked_count} session(s) révoquée(s).",
                "revoked_count": revoked_count,
            },
            status=status.HTTP_200_OK,
        )


class ProfileViewSet(viewsets.ViewSet):
    """
    ViewSet de gestion du profil utilisateur authentifié.

    Toutes les actions sont protégées par IsAuthenticated.
    Ce ViewSet opère uniquement sur l'utilisateur connecté (request.user),
    sans nécessiter de pk dans l'URL.

    Actions :
        - retrieve (GET) : lecture du profil complet
        - update (PUT/PATCH) : mise à jour partielle ou complète du profil
        - destroy (DELETE) : suppression du compte (avec confirmation mot de passe)
    """

    permission_classes = [IsAuthenticated]


    def get_object(self):
        """
        Retourne l'utilisateur connecté.
        Permet d'utiliser ce ViewSet sans pk dans l'URL.
        """
        return self.request.user

    def retrieve(self, request, pk=None):
        """
        Lecture du profil de l'utilisateur connecté.

        GET /api/profile/

        Réponses :
            - 200 : Données du profil sérialisées
            - 401 : Non authentifié
        """
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, pk=None, partial=True):
        """
        Mise à jour du profil de l'utilisateur connecté.

        PUT/PATCH /api/profile/

        Payload attendu (tous les champs optionnels) :
            {
                "first_name": "Jean",
                "last_name": "Dupont",
                "number_phone": "+33 6 12 34 56 78",
                "profile_picture": <fichier image>
            }

        Réponses :
            - 200 : Profil mis à jour, données retournées
            - 400 : Erreurs de validation
            - 401 : Non authentifié
        """
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=partial
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Retourner le profil complet mis à jour
        profile_serializer = ProfileSerializer(request.user)
        return Response(profile_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, pk=None):
        """
        Mise à jour partielle du profil (alias pour PATCH).

        PATCH /api/profile/
        """
        return self.update(request, partial=True)

    def destroy(self, request, pk=None):
        """
        Suppression du compte de l'utilisateur connecté.

        DELETE /api/profile/

        Payload attendu :
            {
                "password": "MotDePasseActuel123!",
                "confirm_deletion": true
            }
            ou
            {
                "password": "MotDePasseActuel123!",
                "confirm_deletion": "DELETE"
            }

        Réponses :
            - 204 : Compte supprimé avec succès
            - 400 : Mot de passe incorrect ou confirmation invalide
            - 401 : Non authentifié
        """
        serializer = DeleteProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Vérifier que le mot de passe correspond
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"password": ["Mot de passe incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Supprimer le compte
        request.user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class UserProfileView(APIView):
    """
    Vue dédiée à la gestion de la photo de profil via Cloudinary.

    Actions :
        - POST : upload d'une nouvelle photo de profil
        - DELETE : suppression de la photo de profil actuelle

    Protégée par IsAuthenticated.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Upload d'une photo de profil.

        POST /api/profile/photo/

        Payload : multipart/form-data avec champ 'photo' (fichier image)

        Réponses :
            - 200 : Photo uploadée, retourne l'URL Cloudinary
            - 400 : Fichier invalide (type, taille, etc.)
            - 401 : Non authentifié
            - 500 : Erreur serveur (Cloudinary)
        """
        from .utils import (
            validate_image_file,
            upload_profile_image,
            CloudinaryError,
            InvalidImageError,
        )

        photo_file = request.FILES.get("photo")
        if not photo_file:
            return Response(
                {"photo": ["Aucun fichier image fourni."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valider le fichier
        try:
            validate_image_file(photo_file)
        except InvalidImageError as e:
            return Response(
                {"photo": [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Upload vers Cloudinary
        try:
            image_url = upload_profile_image(photo_file, request.user.id)
        except CloudinaryError as e:
            return Response(
                {"photo": [str(e)]},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Mettre à jour l'utilisateur avec la nouvelle URL
        request.user.profile_picture = image_url
        request.user.save(update_fields=["profile_picture"])

        return Response(
            {"profile_picture": image_url, "message": "Photo de profil mise à jour."},
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        """
        Suppression de la photo de profil actuelle.

        DELETE /api/profile/photo/

        Réponses :
            - 204 : Photo supprimée (ou aucune photo à supprimer)
            - 401 : Non authentifié
        """
        from .utils import delete_profile_image, extract_public_id_from_url

        current_url = request.user.profile_picture
        if not current_url:
            # Pas de photo à supprimer
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Extraire le public_id depuis l'URL
        public_id = extract_public_id_from_url(current_url)
        if public_id:
            delete_profile_image(public_id)

        # Mettre à jour l'utilisateur
        request.user.profile_picture = None
        request.user.save(update_fields=["profile_picture"])

        return Response(status=status.HTTP_204_NO_CONTENT)



class MeViewSet(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)