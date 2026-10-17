from typing import Any

from rest_framework import serializers

from User.models import UserRole

from .models import Announcer, TypeAnnouncer


class AnnouncerSerializer(serializers.ModelSerializer):
    """Crée ou met à jour l'unique profil annonceur de l'utilisateur connecté."""

    class Meta:
        model = Announcer
        fields = [
            "id",
            "typeAnnonceur",
            "company_name",
            "company_address",
            "company_phone",
            "company_website",
            "company_secteur",
            "description",
            "company_size",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_typeAnnonceur(self, value: str) -> str:
        """Le type "Entreprise / Agence" est désactivé pour le moment.

        Un profil déjà en "Entreprise" peut conserver sa valeur, mais on ne
        peut plus passer à "Entreprise".
        """
        from User.onboarding_serializers import AnnouncerTypeSerializer

        deja_entreprise = (
            self.instance is not None
            and self.instance.typeAnnonceur == TypeAnnouncer.ENTREPRISE
        )
        if (
            value == TypeAnnouncer.ENTREPRISE
            and not AnnouncerTypeSerializer.ENTREPRISE_DISPONIBLE
            and not deja_entreprise
        ):
            raise serializers.ValidationError(
                "Le type « Entreprise / Agence » n'est pas encore disponible."
            )
        return value

    def validate_company_name(self, value: str) -> str:
        return self._required_text(value, "Le nom de l'entreprise est obligatoire.")

    def validate_company_address(self, value: str) -> str:
        return self._required_text(value, "L'adresse de l'entreprise est obligatoire.")

    def validate_company_phone(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le téléphone est obligatoire.")
        if not all(character.isdigit() or character in "+-. ()" for character in value):
            raise serializers.ValidationError(
                "Le téléphone contient des caractères invalides."
            )
        return value

    def validate_company_secteur(self, value: str) -> str:
        return self._required_text(value, "Le secteur d'activité est obligatoire.")

    def validate_description(self, value: str) -> str:
        return self._required_text(value, "La description est obligatoire.")

    def validate_company_size(self, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "La taille de l'entreprise doit être positive."
            )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if self.instance is None:
            user = self.context["request"].user
            if user.role != UserRole.ANNONCEUR:
                raise serializers.ValidationError(
                    "Seul un utilisateur ayant le rôle annonceur peut créer ce profil."
                )
            if Announcer.objects.filter(user=user).exists():
                raise serializers.ValidationError(
                    "Vous possédez déjà un profil annonceur."
                )
        return attrs

    @staticmethod
    def _required_text(value: str, message: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError(message)
        return value

    def create(self, validated_data: dict[str, Any]) -> Announcer:
        if self.context["request"].user.role != UserRole.ANNONCEUR:
            raise serializers.ValidationError(
                "Seul le rôle annonceur peut créer ce profil."
            )
        return Announcer.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )
