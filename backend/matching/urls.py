from django.urls import path
from matching.views import CandidatsRecommandesView, MissionsRecommandeesView

urlpatterns = [
    path(
        "candidats-recommandes/<int:mission_id>/",
        CandidatsRecommandesView.as_view(),
        name="candidats-recommandes",
    ),
    path(
        "missions-recommandees/",
        MissionsRecommandeesView.as_view(),
        name="missions-recommandees",
    ),
]
