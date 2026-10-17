"""
Utilitaires pour la gestion des images de profil via Cloudinary.

Ce module isole toute la logique d'upload, de validation et de suppression
d'images vers Cloudinary, afin de garder les vues propres et testables.

Configuration Cloudinary :
- Initialisée via les variables d'environnement :
  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
"""

import os
import logging
from uuid import uuid4
from typing import Optional

import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.conf import settings

# Configuration Cloudinary au chargement du module
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME")
    or getattr(settings, "CLOUDINARY_CLOUD_NAME", None),
    api_key=os.getenv("CLOUDINARY_API_KEY")
    or getattr(settings, "CLOUDINARY_API_KEY", None),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
    or getattr(settings, "CLOUDINARY_API_SECRET", None),
    secure=True,
)

logger = logging.getLogger(__name__)

# Constantes de validation
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Mo


class CloudinaryError(Exception):
    """Exception personnalisée pour les erreurs Cloudinary."""

    pass


class InvalidImageError(CloudinaryError):
    """Exception levée quand un fichier image est invalide."""

    pass


def validate_image_file(image_file) -> None:
    """
    Valide un fichier image avant upload.

    Vérifications :
    - Type MIME autorisé (JPEG, PNG, WebP)
    - Taille maximale (5 Mo par défaut)

    Args:
        image_file: Fichier uploadé (InMemoryUploadedFile ou similaire)

    Raises:
        InvalidImageError: Si le fichier ne passe pas les validations
    """
    # Vérifier le type MIME
    content_type = getattr(image_file, "content_type", None)
    if content_type not in ALLOWED_MIME_TYPES:
        raise InvalidImageError(
            f"Type de fichier non autorisé : {content_type}. "
            f"Types acceptés : {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # Vérifier la taille
    file_size = getattr(image_file, "size", None)
    if file_size is not None and file_size > MAX_FILE_SIZE:
        raise InvalidImageError(
            f"Fichier trop volumineux : {file_size} octets. "
            f"Taille maximale : {MAX_FILE_SIZE} octets (5 Mo)."
        )

    # Vérifier que le fichier n'est pas vide
    if file_size == 0:
        raise InvalidImageError("Le fichier image est vide.")


def upload_image(image_file, folder: str, public_id_prefix: str) -> str:
    """Upload une image et retourne uniquement son URL Cloudinary sécurisée."""
    public_id = f"{public_id_prefix}_{uuid4().hex}"

    try:
        result = cloudinary.uploader.upload(
            image_file,
            public_id=public_id,
            folder=folder,
            resource_type="image",
            overwrite=False,
            transformation=[
                {"quality": "auto:good"},
                {"fetch_format": "auto"},
            ],
        )
        secure_url = result.get("secure_url")
        if not secure_url:
            raise CloudinaryError("Cloudinary n'a pas retourné d'URL sécurisée.")
        return secure_url
    except cloudinary.exceptions.Error as exc:
        logger.exception("Erreur Cloudinary lors de l'upload dans %s", folder)
        raise CloudinaryError(f"Échec de l'upload vers Cloudinary : {exc}") from exc
    except Exception as exc:
        logger.exception("Erreur inattendue lors de l'upload dans %s", folder)
        raise CloudinaryError(f"Erreur interne lors de l'upload : {exc}") from exc


def upload_profile_image(image_file, user_id: int) -> str:
    """Upload une image de profil via le helper Cloudinary partagé."""
    return upload_image(
        image_file,
        folder="jefly/profiles",
        public_id_prefix=f"profile_{user_id}",
    )


def delete_profile_image(public_id: str) -> bool:
    """Supprime une image Cloudinary sans propager l'erreur à la vue."""
    if not public_id:
        return True

    try:
        result = cloudinary.uploader.destroy(public_id, resource_type="image")
        return result.get("result") in ("ok", "not found")
    except cloudinary.exceptions.Error:
        logger.exception("Erreur Cloudinary lors de la suppression de %s", public_id)
        return False
    except Exception:
        logger.exception("Erreur inattendue lors de la suppression de %s", public_id)
        return False


def extract_public_id_from_url(url: str) -> Optional[str]:
    """
    Extrait le public_id Cloudinary depuis une URL sécurisée.

    Exemple d'URL : https://res.cloudinary.com/cloud_name/image/upload/v123456/jefly/profiles/profile_1_1234567890.jpg
    public_id extrait : jefly/profiles/profile_1_1234567890

    Args:
        url: URL sécurisée Cloudinary

    Returns:
        str ou None: public_id sans extension, ou None si extraction impossible
    """
    if not url:
        return None

    try:
        # Format typique : .../upload/v<version>/<public_id>.<ext>
        # ou : .../upload/<public_id>.<ext>
        parts = url.split("/upload/")
        if len(parts) != 2:
            return None

        path_after_upload = parts[1]
        # Retirer la version si présente (v123456/)
        if path_after_upload.startswith("v") and "/" in path_after_upload:
            path_after_upload = path_after_upload.split("/", 1)[1]

        # Retirer l'extension
        public_id = path_after_upload.rsplit(".", 1)[0]
        return public_id

    except Exception:
        logger.exception("Impossible d'extraire public_id depuis l'URL : %s", url)
        return None



# =============================================================================
# TÉLÉPHONE
# =============================================================================

def normalize_phone(value):
    """Normalise un numéro : retire espaces, points, tirets et parenthèses.

    "+221 77 123 45 67" -> "+221771234567". Renvoie None si vide.
    """
    import re

    if value is None:
        return None
    value = re.sub(r"[\s\.\-\(\)]", "", str(value))
    return value or None


def phone_already_used(phone, exclude_user_id=None):
    """Indique si le numéro (normalisé) appartient déjà à un autre compte."""
    from User.models import User

    if not phone:
        return False
    qs = User.objects.filter(number_phone=phone)
    if exclude_user_id is not None:
        qs = qs.exclude(pk=exclude_user_id)
    return qs.exists()
