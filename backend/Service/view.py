from rest_framework.viewsets import ModelViewSet
from .models import Service
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .serialiser import ServiceSerialiser


class ServiceViewSet(ModelViewSet):
    """CRUD des catégories : consultation authentifiée, écriture admin."""

    queryset = Service.objects.all()
    serializer_class = ServiceSerialiser

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [IsAuthenticated()]
