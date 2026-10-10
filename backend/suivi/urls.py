from django.urls import path

from . import views

urlpatterns = [
    path("missions/<int:mission_id>/", views.SuiviMissionView.as_view(), name="suivi-mission"),
    path(
        "missions/<int:mission_id>/livrables/",
        views.SoumettreLivrableView.as_view(),
        name="suivi-soumettre-livrable",
    ),
    path(
        "missions/<int:mission_id>/repousser-deadline/",
        views.RepousserDeadlineView.as_view(),
        name="suivi-repousser-deadline",
    ),
    path("missions/<int:mission_id>/relancer/", views.RelancerView.as_view(), name="suivi-relancer"),
    path(
        "missions/<int:mission_id>/historique/",
        views.HistoriqueMissionView.as_view(),
        name="suivi-historique",
    ),
    path(
        "missions/<int:mission_id>/demander-annulation/",
        views.DemanderAnnulationView.as_view(),
        name="suivi-demander-annulation",
    ),
    path(
        "livrables/<int:livrable_id>/valider/",
        views.ValiderLivrableView.as_view(),
        name="suivi-valider-livrable",
    ),
    path(
        "livrables/<int:livrable_id>/invalider/",
        views.InvaliderLivrableView.as_view(),
        name="suivi-invalider-livrable",
    ),
    path(
        "demandes-annulation/",
        views.DemandesAnnulationView.as_view(),
        name="suivi-demandes-annulation",
    ),
    path(
        "demandes-annulation/<int:demande_id>/decider/",
        views.DeciderAnnulationView.as_view(),
        name="suivi-decider-annulation",
    ),
]
