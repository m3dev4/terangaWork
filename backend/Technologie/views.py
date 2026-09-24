from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from User.utils import (
    CloudinaryError,
    InvalidImageError,
    upload_image,
    validate_image_file,
)

from .models import Technologie
from .serializers import TechnologieSerializer


class TechnologieViewSet(ModelViewSet):
    """Catalogue : lecture authentifiée, création et gestion réservées à l'admin."""

    queryset = Technologie.objects.all()
    serializer_class = TechnologieSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Crée une technologie dans le catalogue global."""
        image_file = request.FILES.get("image")
        image_url = request.data.get("imgUrl", "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg")

        if image_file is not None:
            try:
                validate_image_file(image_file)
                image_url = upload_image(
                    image_file,
                    folder="jefly/technologies",
                    public_id_prefix="technology",
                )
            except InvalidImageError as exc:
                return Response({"image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
            except CloudinaryError as exc:
                return Response({"image": [str(exc)]}, status=status.HTTP_502_BAD_GATEWAY)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        technology = serializer.save(imgUrl=image_url)
        return Response(
            self.get_serializer(technology).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """Modifie une technologie et remplace son image si fournie."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        image_file = request.FILES.get("image")

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        if image_file is not None:
            try:
                validate_image_file(image_file)
                image_url = upload_image(
                    image_file,
                    folder="jefly/technologies",
                    public_id_prefix="technology",
                )
                technology = serializer.save(imgUrl=image_url)
            except InvalidImageError as exc:
                return Response({"image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
            except CloudinaryError as exc:
                return Response({"image": [str(exc)]}, status=status.HTTP_502_BAD_GATEWAY)
        else:
            technology = serializer.save()

        return Response(self.get_serializer(technology).data)
