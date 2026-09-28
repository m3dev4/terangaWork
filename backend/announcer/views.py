from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Announcer
from .serializers import AnnouncerSerializer


class AnnouncerViewSet(viewsets.GenericViewSet):
    """Gestion du profil annonceur unique de l'utilisateur authentifié."""

    permission_classes = [IsAuthenticated]
    serializer_class = AnnouncerSerializer

    @action(detail=False, methods=["get", "post", "patch"], url_path="me")
    def me(self, request):
        """
        GET/PATCH /api/announcer/me/ lit ou modifie le profil.
        POST /api/announcer/me/ crée le profil une seule fois.
        """
        if request.user.role != "annonceur":
            return Response(
                {"detail": "Seul le rôle annonceur peut accéder à ce profil."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = Announcer.objects.filter(user=request.user).first()

        if request.method == "GET":
            if profile is None:
                return Response(
                    {"detail": "Profil annonceur introuvable."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(self.get_serializer(profile).data)
 
        if request.method == "POST":
            if profile is not None:
                return Response(
                    {"detail": "Vous possédez déjà un profil annonceur."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            profile = serializer.save()
            return Response(
                self.get_serializer(profile).data,
                status=status.HTTP_201_CREATED,
            )

        if profile is None:
            return Response(
                {"detail": "Profil annonceur introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
