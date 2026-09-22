import logging
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class PayDunyaError(Exception):
    """Exception levée en cas d'erreur de communication avec PayDunya."""
    pass


class PayDunyaClient:
    def __init__(self):
        self.master_key = getattr(settings, "PAYDUNYA_MASTER_KEY", "")
        self.private_key = getattr(settings, "PAYDUNYA_PRIVATE_KEY", "")
        self.token = getattr(settings, "PAYDUNYA_TOKEN", "")
        self.mode = getattr(settings, "PAYDUNYA_MODE", "test").lower()

        if self.mode == "live":
            self.base_url = "https://app.paydunya.com/api/v1"
        else:
            self.base_url = "https://app.paydunya.com/sandbox-api/v1"
        
        self.disburse_base_url = "https://app.paydunya.com/api/v2"
        
        logger.info(f"PayDunyaClient initialized in {self.mode} mode")
        logger.info(f"Base URL: {self.base_url}")
        logger.info(f"Disburse URL: {self.disburse_base_url}")
        logger.info(f"Master Key prefix: {self.master_key[:10]}...")
        logger.info(f"Private Key: {self.private_key}")

    def _get_headers(self) -> dict:
        return {
            "PAYDUNYA-MASTER-KEY": self.master_key,
            "PAYDUNYA-PRIVATE-KEY": self.private_key,
            "PAYDUNYA-TOKEN": self.token,
            "Content-Type": "application/json",
        }

    def create_checkout_invoice(
        self,
        amount: str | float | int,
        description: str,
        callback_url: str,
        return_url: str = "",
        cancel_url: str = "",
    ) -> dict:
        """
        Étape 1 Collecte: POST /v1/checkout-invoice/create
        PayDunya exige que total_amount soit envoyé en chaîne de caractères (ex: "5000").
        """
        url = f"{self.base_url}/checkout-invoice/create"
        str_amount = str(amount)

        payload = {
            "invoice": {
                "total_amount": str_amount,
                "description": description,
            },
            "store": {
                "name": "Jëfly",
            },
            "actions": {
                "callback_url": callback_url,
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload, headers=self._get_headers())

            if res.status_code != 200:
                logger.error(f"PayDunya create_checkout_invoice HTTP {res.status_code}: {res.text}")
                raise PayDunyaError(f"Erreur HTTP {res.status_code} lors de la création de facture PayDunya.")

            data = res.json()
            if data.get("response_code") != "00":
                logger.error(f"PayDunya API response error: {data}")
                raise PayDunyaError(data.get("response_text", "Erreur lors de la création de la facture PayDunya."))

            return {
                "token": data.get("token"),
                "response_text": data.get("response_text"),
                "response_code": data.get("response_code"),
                "raw": data,
            }
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Échec de connexion vers PayDunya create_checkout_invoice: {e}")
            raise PayDunyaError("Impossible de contacter le service de paiement PayDunya.")

    def confirm_checkout_invoice(self, token: str) -> dict:
        """
        Étape 2 Collecte Webhook Verification: GET /v1/checkout-invoice/confirm/<token>
        Rappelle immédiatement PayDunya pour obtenir le statut réel vérifié.
        """
        url = f"{self.base_url}/checkout-invoice/confirm/{token}"

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.get(url, headers=self._get_headers())

            if res.status_code != 200:
                logger.error(f"PayDunya confirm_checkout_invoice HTTP {res.status_code}: {res.text}")
                raise PayDunyaError(f"Erreur HTTP {res.status_code} lors de la confirmation de facture PayDunya.")

            data = res.json()
            status = data.get("status", "").lower()
            return {
                "status": status,  # "completed", "failed", "cancelled", "pending"
                "invoice": data.get("invoice", {}),
                "raw": data,
            }
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Échec de connexion vers PayDunya confirm_checkout_invoice: {e}")
            raise PayDunyaError("Impossible de contacter le service de paiement PayDunya pour la confirmation.")

    def create_disburse_invoice(
        self,
        account_alias: str,
        amount: str | float | int,
        callback_url: str,
        withdraw_mode: str = "wave-senegal",
    ) -> dict:
        """
        Étape 3 Décaissement - Pas 1: POST /v2/disburse/get-invoice
        PayDunya exige que amount soit envoyé en chaîne de caractères (ex: "4500").
        Retourne un disburse_token (statut created).
        """
        url = f"{self.disburse_base_url}/disburse/get-invoice"
        str_amount = str(amount)

        payload = {
            "account_alias": account_alias,
            "amount": str_amount,
            "withdraw_mode": withdraw_mode,
            "callback_url": callback_url,
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload, headers=self._get_headers())

            if res.status_code != 200:
                logger.error(f"PayDunya create_disburse_invoice HTTP {res.status_code}: {res.text}")
                raise PayDunyaError(f"Erreur HTTP {res.status_code} lors de l'initialisation du décaissement PayDunya.")

            data = res.json()
            token = data.get("disburse_token") or data.get("token")
            if not token:
                logger.error(f"PayDunya create_disburse_invoice invalid response: {data}")
                raise PayDunyaError(data.get("response_text", "Impossible d'obtenir le token de décaissement PayDunya."))

            return {
                "disburse_token": token,
                "response_code": data.get("response_code"),
                "response_text": data.get("response_text"),
                "raw": data,
            }
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Échec de connexion vers PayDunya create_disburse_invoice: {e}")
            raise PayDunyaError("Impossible de contacter le service de décaissement PayDunya.")

    def submit_disburse_invoice(self, disburse_token: str) -> dict:
        """
        Étape 3 Décaissement - Pas 2: POST /v2/disburse/submit-invoice
        Déclenche réellement l'envoi vers l'opérateur (statut passe à pending).
        """
        url = f"{self.disburse_base_url}/disburse/submit-invoice"
        payload = {
            "disburse_invoice": disburse_token,
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload, headers=self._get_headers())

            if res.status_code != 200:
                logger.error(f"PayDunya submit_disburse_invoice HTTP {res.status_code}: {res.text}")
                raise PayDunyaError(f"Erreur HTTP {res.status_code} lors de la soumission du décaissement PayDunya.")

            data = res.json()
            return {
                "response_code": data.get("response_code"),
                "response_text": data.get("response_text"),
                "raw": data,
            }
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Échec de connexion vers PayDunya submit_disburse_invoice: {e}")
            raise PayDunyaError("Impossible de soumettre le décaissement auprès de PayDunya.")

    def check_disburse_status(self, disburse_token: str) -> dict:
        """
        Étape 4 Décaissement Webhook Verification - Pas 3: POST /v2/disburse/check-status
        Vérifie le statut final du décaissement (success ou failed).
        """
        url = f"{self.disburse_base_url}/disburse/check-status"
        payload = {
            "disburse_invoice": disburse_token,
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload, headers=self._get_headers())

            if res.status_code != 200:
                logger.error(f"PayDunya check_disburse_status HTTP {res.status_code}: {res.text}")
                raise PayDunyaError(f"Erreur HTTP {res.status_code} lors de la vérification du décaissement.")

            data = res.json()
            status = data.get("status", "").lower()
            return {
                "status": status,  # "success", "completed", "failed", "pending"
                "raw": data,
            }
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error(f"Échec de connexion vers PayDunya check_disburse_status: {e}")
            raise PayDunyaError("Impossible de vérifier le statut du décaissement auprès de PayDunya.")
