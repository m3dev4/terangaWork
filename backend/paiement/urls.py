from django.urls import path
from .views import CollecteWebhookView, DecaissementWebhookView

urlpatterns = [
    path(
        "payments/webhooks/paydunya/collecte/",
        CollecteWebhookView.as_view(),
        name="paydunya_webhook_collecte",
    ),
    path(
        "payments/webhooks/paydunya/decaissement/",
        DecaissementWebhookView.as_view(),
        name="paydunya_webhook_decaissement",
    ),
    path(
        "webhooks/paydunya/collecte/",
        CollecteWebhookView.as_view(),
        name="paydunya_webhook_collecte_alt",
    ),
    path(
        "webhooks/paydunya/decaissement/",
        DecaissementWebhookView.as_view(),
        name="paydunya_webhook_decaissement_alt",
    ),
]
