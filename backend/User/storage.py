from django.core.files.storage import FileSystemStorage


class CloudinaryAwareStorage(FileSystemStorage):
    """Stockage par défaut qui laisse passer les URLs absolues.

    Les photos de profil sont uploadées sur Cloudinary et le champ ImageField
    contient directement l'URL complète (https://res.cloudinary.com/...).
    Sans ce stockage, Django la préfixe par MEDIA_URL et produit une URL cassée
    du type /media/https%3A/res.cloudinary.com/...
    Les fichiers locaux (chemins relatifs) gardent le comportement normal.
    """

    def url(self, name):
        if name and str(name).startswith(("http://", "https://")):
            return str(name)
        return super().url(name)
