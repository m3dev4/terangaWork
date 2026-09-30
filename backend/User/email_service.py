"""
Service d'envoi d'emails via Resend.

Ce module fournit les fonctions d'envoi d'emails pour le module d'authentification :
- Envoi du code OTP (inscription / vérification d'email)
- Envoi du lien de réinitialisation de mot de passe

Aucune logique de génération de code OTP ou de token n'est présente ici :
les valeurs sont reçues déjà générées depuis la couche appelante (vues).
"""

import logging
import os
from pathlib import Path
from typing import Dict

import resend
from decouple import config

# Configuration Resend
resend.api_key = config("RESEND_API_KEY", default="")

# Adresse d'expéditeur configurable avec nom d'affichage
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="Teranga Work <no-reply@jefly.app>")

# Durée de validité du code OTP (en minutes) - doit correspondre au serializer
OTP_VALIDITY_MINUTES = 10

# Durée de validité du lien de réinitialisation (en heures)
RESET_LINK_VALIDITY_HOURS = 1

# Logger pour ce module
logger = logging.getLogger(__name__)

# Chemin vers le dossier des templates
TEMPLATES_DIR = Path(__file__).parent / "templates" / "emails"


def _load_template(template_name: str) -> str:
    """
    Charge un template HTML depuis le dossier templates/emails.

    Args:
        template_name: Nom du fichier template (ex: "otp_email.html")

    Returns:
        Contenu du template en string

    Raises:
        FileNotFoundError: Si le template n'existe pas
    """
    template_path = TEMPLATES_DIR / template_name
    if not template_path.exists():
        logger.error("Template introuvable: %s", template_path)
        raise FileNotFoundError(f"Template email non trouvé: {template_name}")
    return template_path.read_text(encoding="utf-8")


# Templates textuels (fallback) - restent en constantes car simples
OTP_EMAIL_TEXT_TEMPLATE = """
Votre code de vérification Teranga Work

Bonjour,

Voici votre code de vérification à 6 chiffres : {otp_code}

Ce code est valide pendant {validity_minutes} minutes.
Ne le partagez avec personne.

Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.

---
Teranga Work
"""

RESET_EMAIL_TEXT_TEMPLATE = """
Réinitialisation de votre mot de passe - Teranga Work

Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.
Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :

{reset_link}

Ce lien est valide pendant {validity_hours} heure(s).

⚠ SÉCURITÉ : Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
Votre mot de passe ne sera pas modifié tant que vous n'aurez pas cliqué sur le lien ci-dessus.

Pour votre sécurité, ce lien ne peut être utilisé qu'une seule fois.

---
Teranga Work
"""


def send_otp_email(email: str, otp_code: str) -> Dict[str, object]:
    """
    Envoie un email contenant le code OTP pour la vérification d'email.

    Args:
        email: Adresse email du destinataire.
        otp_code: Code OTP à 6 chiffres (déjà validé par le serializer).

    Returns:
        Dict contenant :
        - success (bool): True si l'envoi a réussi, False sinon.
        - error (str | None): Message d'erreur si success=False, None sinon.
        - email_id (str | None): ID de l'email Resend si succès, None sinon.

    Erreurs possibles (retournées dans le dict, jamais levées) :
        - Configuration manquante (RESEND_API_KEY non définie)
        - Erreur réseau / API Resend (timeout, quota, email invalide, etc.)
        - Erreur inattendue
    """
    # Vérification de la configuration
    if not resend.api_key:
        logger.error("RESEND_API_KEY non configurée - impossible d'envoyer l'email OTP")
        return {
            "success": False,
            "error": "Configuration email manquante",
            "email_id": None,
        }

    if not email or not otp_code:
        logger.error(
            "Paramètres invalides pour send_otp_email: email=%s, otp_code_present=%s",
            bool(email),
            bool(otp_code),
        )
        return {"success": False, "error": "Paramètres invalides", "email_id": None}

    try:
        # Construction du sujet et du corps
        subject = "Votre code de vérification"
        html_template = _load_template("otp_email.html")
        html_content = html_template.format(
            otp_code=otp_code, validity_minutes=OTP_VALIDITY_MINUTES
        )
        text_content = OTP_EMAIL_TEXT_TEMPLATE.format(
            otp_code=otp_code, validity_minutes=OTP_VALIDITY_MINUTES
        )

        # Envoi via Resend
        response = resend.Emails.send(
            {
                "from": DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
        )

        email_id = response.get("id") if isinstance(response, dict) else None
        logger.info("Email OTP envoyé avec succès à %s (id: %s)", email, email_id)
        return {"success": True, "error": None, "email_id": email_id}

    except resend.exceptions.ResendError as e:
        logger.exception(
            "Erreur Resend lors de l'envoi de l'email OTP à %s: %s", email, str(e)
        )
        return {
            "success": False,
            "error": f"Erreur d'envoi email: {str(e)}",
            "email_id": None,
        }

    except Exception as e:
        logger.exception(
            "Erreur inattendue lors de l'envoi de l'email OTP à %s: %s", email, str(e)
        )
        return {
            "success": False,
            "error": "Erreur interne d'envoi email",
            "email_id": None,
        }


def send_password_reset_email(email: str, reset_link: str) -> Dict[str, object]:
    """
    Envoie un email contenant le lien de réinitialisation de mot de passe.

    Args:
        email: Adresse email du destinataire.
        reset_link: Lien complet de réinitialisation (construit côté vue avec uidb64 + token).

    Returns:
        Dict contenant :
        - success (bool): True si l'envoi a réussi, False sinon.
        - error (str | None): Message d'erreur si success=False, None sinon.
        - email_id (str | None): ID de l'email Resend si succès, None sinon.

    Erreurs possibles (retournées dans le dict, jamais levées) :
        - Configuration manquante (RESEND_API_KEY non définie)
        - Erreur réseau / API Resend (timeout, quota, email invalide, etc.)
        - Erreur inattendue
    """
    # Vérification de la configuration
    if not resend.api_key:
        logger.error(
            "RESEND_API_KEY non configurée - impossible d'envoyer l'email de réinitialisation"
        )
        return {
            "success": False,
            "error": "Configuration email manquante",
            "email_id": None,
        }

    if not email or not reset_link:
        logger.error(
            "Paramètres invalides pour send_password_reset_email: email=%s, reset_link_present=%s",
            bool(email),
            bool(reset_link),
        )
        return {"success": False, "error": "Paramètres invalides", "email_id": None}

    try:
        # Construction du sujet et du corps
        subject = "Réinitialisation de votre mot de passe"
        html_template = _load_template("password_reset_email.html")
        html_content = html_template.format(
            reset_link=reset_link, validity_hours=RESET_LINK_VALIDITY_HOURS
        )
        text_content = RESET_EMAIL_TEXT_TEMPLATE.format(
            reset_link=reset_link, validity_hours=RESET_LINK_VALIDITY_HOURS
        )

        # Envoi via Resend
        response = resend.Emails.send(
            {
                "from": DEFAULT_FROM_EMAIL,
                "to": [email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            }
        )

        email_id = response.get("id") if isinstance(response, dict) else None
        logger.info(
            "Email de réinitialisation envoyé avec succès à %s (id: %s)",
            email,
            email_id,
        )
        return {"success": True, "error": None, "email_id": email_id}

    except resend.exceptions.ResendError as e:
        logger.exception(
            "Erreur Resend lors de l'envoi de l'email de réinitialisation à %s: %s",
            email,
            str(e),
        )
        return {
            "success": False,
            "error": f"Erreur d'envoi email: {str(e)}",
            "email_id": None,
        }

    except Exception as e:
        logger.exception(
            "Erreur inattendue lors de l'envoi de l'email de réinitialisation à %s: %s",
            email,
            str(e),
        )
        return {
            "success": False,
            "error": "Erreur interne d'envoi email",
            "email_id": None,
        }
