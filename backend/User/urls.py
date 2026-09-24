from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, ProfileViewSet, UserProfileView, MeViewSet
from .admin_views import SignalementViewSet, AdminDashboardStatsView
from .onboarding_views import (
    OnboardingStatusView,
    OnboardingStepView,
    OnboardingSkipView,
    OnboardingBackView,
)

router = DefaultRouter()

router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"profile", ProfileViewSet, basename="profile")
router.register(r"signalements", SignalementViewSet, basename="signalement")


urlpatterns = router.urls + [
    path("profile/photo/", UserProfileView.as_view(), name="profile-photo"),
    path("me/", MeViewSet.as_view(), name="me"),
    path("admin/dashboard/stats/", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
    # Onboarding endpoints
    path(
        "onboarding/status/",
        OnboardingStatusView.as_view(),
        name="onboarding-status",
    ),
    path(
        "onboarding/skip/<str:step_name>/",
        OnboardingSkipView.as_view(),
        name="onboarding-skip",
    ),
    path(
        "onboarding/back/<str:step_name>/",
        OnboardingBackView.as_view(),
        name="onboarding-back",
    ),
    path(
        "onboarding/<str:step_name>/",
        OnboardingStepView.as_view(),
        name="onboarding-step",
    ),
]
