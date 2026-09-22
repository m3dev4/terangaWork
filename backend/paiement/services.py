from decimal import Decimal
import logging
from django.conf import settings
from django.utils import timezone

from mission.models import MissionStatus
from proposition.models import PropositionStatus
from .models import NumeroPaiement, Paiement, StatutCollecte, StatutDecaissement
from .paydunya_client import PayDunyaClient, PayDunyaError

logger = logging.getLogger(__name__)


class NumeroPaiementManquantError(Exception):
    """Levée si aucun numéro mobile money n'a été enregistré par le freelance pour cet opérateur."""
    pass


class DuplicatePaymentError(Exception):
    """Levée si un paiement est déjà en cours ou réussi pour la mission."""
    pass


class InvalidMissionStatusError(Exception):
    """Levée si le statut de la mission ne permet pas l'opération."""
    pass


def initiate_collection(mission, user, paydunya_client=None) -> dict:
    """
    Étape 1: Initier la collecte PayDunya.
    Vérifie Mission.status == COMPLETED, l'existence d'une proposition acceptée,
    et l'absence de paiement en cours (EN_ATTENTE) ou déjà réussi (REUSSI) -> 409 Conflict.
    """
    if mission.status != MissionStatus.COMPLETED:
        raise InvalidMissionStatusError(
            f"Le paiement ne peut être initié que si la mission est terminée (actuel: {mission.status})."
        )

    accepted_prop = mission.propositions.filter(
        proposition_status=PropositionStatus.ACCEPTED
    ).first()

    if not accepted_prop:
        raise InvalidMissionStatusError("Aucune proposition acceptée sur cette mission.")

    # Anti-double click check
    existing_paiement = Paiement.objects.filter(proposition=accepted_prop).first()
    if existing_paiement:
        # Paiement réussi : on bloque
        if existing_paiement.statut_collecte == StatutCollecte.REUSSI:
            raise DuplicatePaymentError(
                "Un paiement pour cette mission a déjà été effectué avec succès."
            )
        
        # Paiement en attente AVEC référence PayDunya valide : on bloque
        if (
            existing_paiement.statut_collecte == StatutCollecte.EN_ATTENTE
            and existing_paiement.reference_collecte
        ):
            raise DuplicatePaymentError(
                "Un paiement pour cette mission est déjà en cours de traitement. "
                f"Référence: {existing_paiement.reference_collecte}"
            )
        
        # Paiement en attente SANS référence (processus interrompu) : on réutilise et on réessaie

    commission_rate = Decimal(str(getattr(settings, "PAYDUNYA_COMMISSION_RATE", 0.10)))
    montant_brut = Decimal(str(mission.budget))
    montant_commission = (montant_brut * commission_rate).quantize(Decimal("0.01"))
    montant_net = (montant_brut - montant_commission).quantize(Decimal("0.01"))

    if existing_paiement:
        paiement = existing_paiement
        paiement.montant_brut = montant_brut
        paiement.taux_commission = commission_rate
        paiement.montant_commission = montant_commission
        paiement.montant_net = montant_net
        paiement.statut_collecte = StatutCollecte.EN_ATTENTE
        paiement.statut_decaissement = StatutDecaissement.NON_DECLENCHE
        paiement.save()
    else:
        paiement = Paiement.objects.create(
            proposition=accepted_prop,
            montant_brut=montant_brut,
            taux_commission=commission_rate,
            montant_commission=montant_commission,
            montant_net=montant_net,
            statut_collecte=StatutCollecte.EN_ATTENTE,
            statut_decaissement=StatutDecaissement.NON_DECLENCHE,
        )

    client = paydunya_client or PayDunyaClient()
    base_setting = getattr(settings, "PAYDUNYA_CALLBACK_BASE_URL", "http://localhost:8000").rstrip("/")
    if "webhooks/paydunya" in base_setting:
        callback_url = f"{base_setting}/collecte/" if not base_setting.endswith("/collecte/") else base_setting
    else:
        callback_url = f"{base_setting}/api/payments/webhooks/paydunya/collecte/"
    description = f"Paiement Jefly Mission #{mission.id}: {mission.title}"

    checkout_res = client.create_checkout_invoice(
        amount=str(montant_brut),
        description=description,
        callback_url=callback_url,
    )

    paiement.reference_collecte = checkout_res["token"]
    paiement.save()

    return {
        "token": checkout_res["token"],
        "payment_url": checkout_res["response_text"],
        "paiement": paiement,
    }


def process_collection_webhook(token: str, payload: dict, paydunya_client=None) -> Paiement:
    """
    Étape 2: Webhook confirmation de collecte PayDunya.
    Vérifie impérativement le statut réel auprès de PayDunya via GET /v1/checkout-invoice/confirm/<token>.
    """
    client = paydunya_client or PayDunyaClient()
    logger.info(f"WEBHOOK COLLECTE REÇU - Token: {token}, Payload brut: {payload}")

    verified = client.confirm_checkout_invoice(token)
    confirmed_status = verified.get("status", "").lower()
    logger.info(f"WEBHOOK COLLECTE VÉRIFIÉ - Token: {token}, Brut: {payload.get('status')}, Confirmé: {confirmed_status}")

    try:
        paiement = Paiement.objects.get(reference_collecte=token)
    except Paiement.DoesNotExist:
        logger.error(f"Aucun Paiement correspondant au token de collecte {token}")
        raise PayDunyaError(f"Paiement introuvable pour la référence {token}")

    if confirmed_status == "completed":
        paiement.statut_collecte = StatutCollecte.REUSSI
        paiement.date_collecte = timezone.now()
        paiement.save()
        
        # Notifier le succès du paiement
        from notification.services import notifier_paiement_reussi
        notifier_paiement_reussi(paiement)

        # Déclenchement automatique de l'étape 3 (décaissement)
        # TODO: Réactiver quand les clés PayDunya Payout seront validées
        # trigger_disbursement(paiement, paydunya_client=client)
        logger.warning(f"Décaissement désactivé - Collecte réussie paiement #{paiement.id}")

    elif confirmed_status in ["failed", "cancelled"]:
        paiement.statut_collecte = StatutCollecte.ECHOUE
        paiement.save()
        
        # Notifier l'échec du paiement
        from notification.services import notifier_paiement_echoue
        notifier_paiement_echoue(paiement)

    return paiement


def trigger_disbursement(paiement: Paiement, paydunya_client=None) -> Paiement:
    """
    Étape 3: Décaissement vers le Freelance.
    1. Récupère NumeroPaiement pour (freelance, operateur_mobile_money).
    2. Appelle POST /v2/disburse/get-invoice (création) -> disburse_token.
    3. Appelle immédiatement POST /v2/disburse/submit-invoice (soumission).
    """
    freelance = paiement.proposition.freelance
    operateur = paiement.proposition.mission.operateurMobileMoney

    try:
        numero_obj = NumeroPaiement.objects.get(
            freelance=freelance,
            operateur=operateur,
        )
    except NumeroPaiement.DoesNotExist:
        logger.error(
            f"NumeroPaiement manquant pour le freelance #{freelance.id} et l'opérateur {operateur}"
        )
        raise NumeroPaiementManquantError(
            f"Aucun numéro mobile money enregistré pour ce freelance et l'opérateur {operateur}."
        )

    account_alias = numero_obj.numero
    client = paydunya_client or PayDunyaClient()
    base_setting = getattr(settings, "PAYDUNYA_CALLBACK_BASE_URL", "http://localhost:8000").rstrip("/")
    if "webhooks/paydunya" in base_setting:
        clean_base = base_setting.replace("/collecte", "").rstrip("/")
        callback_url = f"{clean_base}/decaissement/"
    else:
        callback_url = f"{base_setting}/api/payments/webhooks/paydunya/decaissement/"

    # Pas 1: get-invoice
    disburse_res = client.create_disburse_invoice(
        account_alias=account_alias,
        amount=str(paiement.montant_net),
        callback_url=callback_url,
    )
    disburse_token = disburse_res["disburse_token"]

    # Pas 2: submit-invoice
    client.submit_disburse_invoice(disburse_token)

    paiement.reference_decaissement = disburse_token
    paiement.statut_decaissement = StatutDecaissement.EN_ATTENTE
    paiement.save()

    return paiement


def process_disbursement_webhook(disburse_token: str, payload: dict, paydunya_client=None) -> Paiement:
    """
    Étape 4: Webhook confirmation de décaissement PayDunya.
    Revérifie auprès de PayDunya POST /v2/disburse/check-status.
    """
    client = paydunya_client or PayDunyaClient()
    logger.info(f"WEBHOOK DÉCAISSEMENT REÇU - Token: {disburse_token}, Payload brut: {payload}")

    verified = client.check_disburse_status(disburse_token)
    confirmed_status = verified.get("status", "").lower()
    logger.info(f"WEBHOOK DÉCAISSEMENT VÉRIFIÉ - Token: {disburse_token}, Brut: {payload.get('status')}, Confirmé: {confirmed_status}")

    try:
        paiement = Paiement.objects.get(reference_decaissement=disburse_token)
    except Paiement.DoesNotExist:
        logger.error(f"Aucun Paiement correspondant au token de décaissement {disburse_token}")
        raise PayDunyaError(f"Paiement introuvable pour le décaissement {disburse_token}")

    if confirmed_status in ["success", "completed"]:
        paiement.statut_decaissement = StatutDecaissement.REUSSI
        paiement.date_decaissement = timezone.now()
        paiement.save()

        # Log pour l'admin
        freelance_user = paiement.proposition.freelance.user
        logger.info(
            f"SUCCÈS DÉCAISSEMENT: {freelance_user.email} - "
            f"Montant net de {paiement.montant_net} FCFA versé pour la mission '{paiement.proposition.mission.title}'."
        )

    elif confirmed_status == "failed":
        paiement.statut_decaissement = StatutDecaissement.ECHOUE
        paiement.save()

        # Alerte pour intervention manuelle
        annonceur_user = paiement.proposition.mission.annonceur.user
        logger.error(
            f"ALERTE ADMIN & ANNONCEUR [Échec Décaissement]: Mission #{paiement.proposition.mission.id} - "
            f"Annonceur {annonceur_user.email}. La collecte de {paiement.montant_brut} FCFA a réussi, "
            f"mais le décaissement de {paiement.montant_net} FCFA au freelance a échoué (Ref: {paiement.reference_decaissement})."
        )

    return paiement
