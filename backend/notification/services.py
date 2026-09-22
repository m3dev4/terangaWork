"""
Service centralisé pour la gestion des notifications.

Ce module fournit la fonction notifier() qui est LE SEUL POINT
où les notifications doivent être créées dans toute l'application.
"""

from typing import Optional
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from .serializers import NotificationSerializer

User = get_user_model()


def notifier(
    utilisateur,
    type_notif: str,
    titre: str,
    message: str,
    mission=None,
    proposition=None,
    paiement=None,
    message_obj=None
):
    """
    Crée une notification et l'envoie en temps réel via WebSocket.
    
    C'est LA SEULE FONCTION à utiliser pour créer des notifications.
    
    Args:
        utilisateur: User - Utilisateur qui reçoit la notification
        type_notif: str - Type de notification (voir Notification.TYPE_CHOICES)
        titre: str - Titre court de la notification
        message: str - Message détaillé
        mission: Mission (optionnel) - Mission concernée
        proposition: Proposition (optionnel) - Proposition concernée
        paiement: Paiement (optionnel) - Paiement concerné
        message_obj: Message (optionnel) - Message concerné
    
    Returns:
        Notification créée
    
    Exemple:
        >>> from notification.services import notifier
        >>> notifier(
        ...     utilisateur=freelance_user,
        ...     type_notif='PROPOSITION_ACCEPTEE',
        ...     titre='Proposition acceptée !',
        ...     message='Votre proposition pour la mission "Site e-commerce" a été acceptée',
        ...     mission=mission_obj,
        ...     proposition=proposition_obj
        ... )
    """
    
    # Valider le type de notification
    types_valides = [choice[0] for choice in Notification.TYPE_CHOICES]
    if type_notif not in types_valides:
        raise ValueError(
            f"Type de notification invalide: {type_notif}. "
            f"Choix valides: {', '.join(types_valides)}"
        )
    
    # Créer la notification en base de données
    notification = Notification.objects.create(
        utilisateur=utilisateur,
        type=type_notif,
        titre=titre,
        message=message,
        mission=mission,
        proposition=proposition,
        paiement=paiement,
        message_obj=message_obj
    )
    
    # Sérialiser pour l'envoyer via WebSocket
    serializer = NotificationSerializer(notification)
    notification_data = serializer.data
    
    # Envoyer via WebSocket (si l'utilisateur est connecté)
    try:
        channel_layer = get_channel_layer()
        group_name = f"notifications.{utilisateur.id}"
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_event',
                'notification': notification_data
            }
        )
    except Exception as e:
        # Log l'erreur mais ne pas faire échouer la création de notification
        print(f"⚠️ Erreur envoi WebSocket notification: {e}")
    
    return notification


def notifier_nouveau_message(message_obj):
    """
    Notifie le destinataire d'un nouveau message.
    
    Args:
        message_obj: Message - Le message envoyé
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=message_obj.destinataire,
        type_notif='NOUVEAU_MESSAGE',
        titre=f'Nouveau message de {message_obj.expediteur.get_full_name() or message_obj.expediteur.username}',
        message=message_obj.contenu[:100] if message_obj.type == 'TEXTE' else 'Message vocal',
        mission=message_obj.mission,
        message_obj=message_obj
    )


def notifier_proposition_acceptee(proposition):
    """
    Notifie le freelance que sa proposition a été acceptée.
    
    Args:
        proposition: Proposition acceptée
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=proposition.freelancee,
        type_notif='PROPOSITION_ACCEPTEE',
        titre='Proposition acceptée ! 🎉',
        message=f'Félicitations ! Votre proposition pour "{proposition.mission.titre}" a été acceptée par {proposition.mission.annonceur.get_full_name()}.',
        mission=proposition.mission,
        proposition=proposition
    )


def notifier_proposition_rejetee(proposition):
    """
    Notifie le freelance que sa proposition a été rejetée.
    
    Args:
        proposition: Proposition rejetée
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=proposition.freelancee,
        type_notif='PROPOSITION_REJETEE',
        titre='Proposition non retenue',
        message=f'Votre proposition pour "{proposition.mission.titre}" n\'a pas été retenue cette fois-ci.',
        mission=proposition.mission,
        proposition=proposition
    )


def notifier_mission_demarree(mission, utilisateur_a_notifier):
    """
    Notifie le démarrage d'une mission.
    
    Args:
        mission: Mission démarrée
        utilisateur_a_notifier: User à notifier
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=utilisateur_a_notifier,
        type_notif='MISSION_DEMARREE',
        titre='Mission démarrée',
        message=f'La mission "{mission.titre}" a officiellement démarré.',
        mission=mission
    )


def notifier_mission_livree(mission, utilisateur_a_notifier):
    """
    Notifie qu'une mission a été livrée.
    
    Args:
        mission: Mission livrée
        utilisateur_a_notifier: User à notifier (généralement l'annonceur)
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=utilisateur_a_notifier,
        type_notif='MISSION_LIVREE',
        titre='Mission livrée',
        message=f'Le freelance a marqué la mission "{mission.titre}" comme livrée. Veuillez vérifier le travail.',
        mission=mission
    )


def notifier_mission_completee(mission, utilisateur_a_notifier):
    """
    Notifie qu'une mission est complétée.
    
    Args:
        mission: Mission complétée
        utilisateur_a_notifier: User à notifier
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=utilisateur_a_notifier,
        type_notif='MISSION_COMPLETEE',
        titre='Mission complétée ! ✅',
        message=f'La mission "{mission.titre}" est maintenant terminée et validée.',
        mission=mission
    )


def notifier_mission_annulee(mission, utilisateur_a_notifier):
    """
    Notifie qu'une mission a été annulée.
    
    Args:
        mission: Mission annulée
        utilisateur_a_notifier: User à notifier
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=utilisateur_a_notifier,
        type_notif='MISSION_ANNULEE',
        titre='Mission annulée',
        message=f'La mission "{mission.titre}" a été annulée.',
        mission=mission
    )


def notifier_mission_litige(mission, utilisateur_a_notifier):
    """
    Notifie l'ouverture d'un litige sur une mission.
    
    Args:
        mission: Mission en litige
        utilisateur_a_notifier: User à notifier
    
    Returns:
        Notification créée
    """
    return notifier(
        utilisateur=utilisateur_a_notifier,
        type_notif='MISSION_LITIGE',
        titre='Litige ouvert ⚠️',
        message=f'Un litige a été ouvert sur la mission "{mission.titre}". Notre équipe va examiner la situation.',
        mission=mission
    )


def notifier_paiement_reussi(paiement):
    """
    Notifie que le paiement a réussi.
    
    Args:
        paiement: Paiement réussi
    
    Returns:
        Tuple (notification_annonceur, notification_freelance)
    """
    mission = paiement.mission
    
    # Notifier l'annonceur
    notif_annonceur = notifier(
        utilisateur=mission.annonceur,
        type_notif='PAIEMENT_REUSSI',
        titre='Paiement effectué ✓',
        message=f'Votre paiement de {paiement.montant} FCFA pour "{mission.titre}" a été traité avec succès.',
        mission=mission,
        paiement=paiement
    )
    
    # Notifier le freelance
    proposition_acceptee = mission.propositions.filter(statut='ACCEPTEE').first()
    if proposition_acceptee:
        notif_freelance = notifier(
            utilisateur=proposition_acceptee.freelancee,
            type_notif='PAIEMENT_REUSSI',
            titre='Paiement reçu ✓',
            message=f'Le paiement pour la mission "{mission.titre}" a été effectué. Le décaissement sera traité prochainement.',
            mission=mission,
            paiement=paiement
        )
        return (notif_annonceur, notif_freelance)
    
    return (notif_annonceur, None)


def notifier_paiement_echoue(paiement):
    """
    Notifie que le paiement a échoué.
    
    Args:
        paiement: Paiement échoué
    
    Returns:
        Notification créée
    """
    mission = paiement.mission
    
    return notifier(
        utilisateur=mission.annonceur,
        type_notif='PAIEMENT_ECHOUE',
        titre='Échec du paiement ❌',
        message=f'Le paiement pour "{mission.titre}" a échoué. Veuillez réessayer ou contacter le support.',
        mission=mission,
        paiement=paiement
    )
