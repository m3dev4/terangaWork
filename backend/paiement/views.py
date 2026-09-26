import logging
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .paydunya_client import PayDunyaError
from .services import (
    process_collection_webhook,
    process_disbursement_webhook,
)

logger = logging.getLogger(__name__)


class CollecteWebhookView(APIView):
    """
    POST /api/payments/webhooks/paydunya/collecte/
    Endpoint public appelé par PayDunya lors de la confirmation de paiement.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.data
        logger.info(f"=== WEBHOOK COLLECTE REÇU ===")
        logger.info(f"Payload: {payload}")
        logger.info(f"Query params: {request.query_params}")
        logger.info(f"Headers: {dict(request.headers)}")
        
        # PayDunya envoie les données avec le préfixe 'data[...]'
        token = (
            payload.get("token")
            or payload.get("data[invoice][token]")  # Format PayDunya
            or payload.get("custom_data", {}).get("token")
            or payload.get("invoice", {}).get("token")
            or request.query_params.get("token")
        )

        if not token:
            logger.error(f"Token manquant dans webhook. Payload: {payload}")
            return Response(
                {"error": "Token de collecte manquant dans le webhook."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            paiement = process_collection_webhook(token, payload)
            return Response(
                {
                    "message": "Webhook de collecte traité.",
                    "statut_collecte": paiement.statut_collecte,
                    "statut_decaissement": paiement.statut_decaissement,
                },
                status=status.HTTP_200_OK,
            )
        except PayDunyaError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Erreur interne lors du traitement du webhook: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DecaissementWebhookView(APIView):
    """
    POST /api/payments/webhooks/paydunya/decaissement/
    Endpoint public appelé par PayDunya lors de la confirmation de décaissement.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.data
        disburse_token = (
            payload.get("disburse_token")
            or payload.get("token")
            or payload.get("disburse_invoice")
            or request.query_params.get("disburse_token")
        )

        if not disburse_token:
            return Response(
                {"error": "Token de décaissement manquant dans le webhook."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            paiement = process_disbursement_webhook(disburse_token, payload)
            return Response(
                {
                    "message": "Webhook de décaissement traité.",
                    "statut_decaissement": paiement.statut_decaissement,
                },
                status=status.HTTP_200_OK,
            )
        except PayDunyaError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Erreur interne lors du traitement du webhook: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
