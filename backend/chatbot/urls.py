from django.urls import path
from .views import (
    ConversationListView,
    ConversationDetailView,
    SendChatMessageView,
)
from .data_views import (
    FreelancePropositionsDataView,
    FreelanceMissionsAccepteesDataView,
    FreelanceProfilDataView,
    AnnonceurMissionsDataView,
    AnnonceurMissionCandidaturesDataView,
    AnnonceurMissionRecommandationsDataView,
)

app_name = "chatbot"

# Endpoints exposés au frontend React (authentifiés via JWT)
frontend_urlpatterns = [
    path(
        "conversations/",
        ConversationListView.as_view(),
        name="chat-conversation-list",
    ),
    path(
        "conversations/<int:pk>/messages/",
        ConversationDetailView.as_view(),
        name="chat-conversation-messages",
    ),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="chat-conversation-detail",
    ),
    path(
        "conversations/<int:pk>/send/",
        SendChatMessageView.as_view(),
        name="chat-send-message",
    ),
]

# Endpoints internes appelés par le microservice FastAPI (clé API partagée)
# Montés sous /api/chat/data/...
data_urlpatterns = [
    path(
        "data/freelance/propositions/",
        FreelancePropositionsDataView.as_view(),
        name="chat-data-freelance-propositions",
    ),
    path(
        "data/freelance/missions-acceptees/",
        FreelanceMissionsAccepteesDataView.as_view(),
        name="chat-data-freelance-missions-acceptees",
    ),
    path(
        "data/freelance/profil/",
        FreelanceProfilDataView.as_view(),
        name="chat-data-freelance-profil",
    ),
    path(
        "data/annonceur/missions/",
        AnnonceurMissionsDataView.as_view(),
        name="chat-data-annonceur-missions",
    ),
    path(
        "data/annonceur/mission/<int:mission_id>/candidatures/",
        AnnonceurMissionCandidaturesDataView.as_view(),
        name="chat-data-annonceur-mission-candidatures",
    ),
    path(
        "data/annonceur/mission/<int:mission_id>/recommandations/",
        AnnonceurMissionRecommandationsDataView.as_view(),
        name="chat-data-annonceur-mission-recommandations",
    ),
]

urlpatterns = frontend_urlpatterns + data_urlpatterns
