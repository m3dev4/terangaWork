from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MissionViewSet
from .generateDescriptionView import GenerateDescriptionView
from .moderationView import MissionModerationView

router = DefaultRouter()
router.register(r"missions", MissionViewSet, basename="mission")

urlpatterns = [
    path(
        "missions/generate-description/",
        GenerateDescriptionView.as_view(),
        name="generate-description",
    ),
    path(
        "missions/<int:mission_id>/moderation/",
        MissionModerationView.as_view(),
        name="mission-moderation",
    ),
] + router.urls
