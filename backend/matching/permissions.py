from rest_framework.permissions import BasePermission
from User.models import UserRole
from User.onboarding_views import IsOnboardingComplete


class IsAnnonceur(BasePermission):
    """Vérifie que l'utilisateur a le rôle d'annonceur."""

    message = "Seul un annonceur peut effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ANNONCEUR
        )


class IsFreelance(BasePermission):
    """Vérifie que l'utilisateur a le rôle de freelance."""

    message = "Seul un freelance peut effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.FREELANCE
        )
