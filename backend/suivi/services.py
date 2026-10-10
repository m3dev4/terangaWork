"""
Logique métier du suivi de mission par phases.

Toutes les règles vivent ici : les vues ne font que vérifier l'identité
de l'appelant et traduire les erreurs en réponses HTTP.

Principe (BNF7) : le système détecte, notifie et trace. Les décisions
(valider, invalider, repousser, annuler) restent humaines.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from mission.models import MissionStatus
from notification.services import notifier, notifier_mission_annulee
from proposition.models import PropositionStatus

from .models import (
    ActionHistorique,
    CommentaireLivrable,
    DemandeAnnulation,
    Historique,
    Livrable,
    Phase,
    StatutDemandeAnnulation,
    StatutLivrable,
    StatutPhase,
    TypeCommentaire,
    TypePhase,
)

User = get_user_model()

DELAI_CADRAGE_JOURS = getattr(settings, "SUIVI_DELAI_CADRAGE_JOURS", 5)
DELAI_VALIDATION_JOURS = getattr(settings, "SUIVI_DELAI_VALIDATION_JOURS", 3)


class SuiviError(Exception):
    """Règle métier non respectée (traduite en 400 par les vues)."""


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------


def tracer(mission, action, auteur=None, details=""):
    """Ajoute une ligne à l'historique de la mission."""
    return Historique.objects.create(
        mission=mission, action=action, auteur=auteur, details=details
    )


def proposition_acceptee(mission):
    return (
        mission.propositions.select_related("freelance__user")
        .filter(proposition_status=PropositionStatus.ACCEPTED)
        .first()
    )


def freelance_assigne(mission):
    prop = proposition_acceptee(mission)
    return prop.freelance if prop else None


def est_admin(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


def est_annonceur_de(user, mission):
    return bool(user and user.is_authenticated and mission.annonceur.user_id == user.id)


def est_freelance_de(user, mission):
    freelance = freelance_assigne(mission)
    return bool(freelance and user and freelance.user_id == user.id)


def admins():
    return User.objects.filter(is_active=True).filter(Q(is_staff=True) | Q(is_superuser=True))


def phase_en_cours(mission):
    return (
        mission.phases.filter(statut=StatutPhase.EN_COURS)
        .order_by("-date_ouverture")
        .first()
    )


def _verifier_mission_active(mission):
    if mission.status != MissionStatus.IN_PROGRESS:
        raise SuiviError(
            f"Action impossible : la mission n'est pas en cours (statut : {mission.status})."
        )


def _creer_commentaire(livrable, auteur, texte="", fichier_vocal=None, obligatoire=False):
    texte = (texte or "").strip()
    if not texte and not fichier_vocal:
        if obligatoire:
            raise SuiviError(
                "Un commentaire est obligatoire : écrivez un texte ou envoyez un message vocal."
            )
        return None
    return CommentaireLivrable.objects.create(
        livrable=livrable,
        auteur=auteur,
        type=TypeCommentaire.VOCAL if fichier_vocal else TypeCommentaire.TEXTE,
        texte=texte,
        fichier_vocal=fichier_vocal,
    )


# ---------------------------------------------------------------------------
# Phase 1 : ouverture du cadrage
# ---------------------------------------------------------------------------


def ouvrir_phase_cadrage(mission):
    """
    Appelé à l'acceptation de la candidature. Idempotent : une mission
    n'a qu'une seule phase de cadrage.
    """
    phase, creee = Phase.objects.get_or_create(
        mission=mission,
        type=TypePhase.CADRAGE,
        defaults={"date_limite": timezone.localdate() + timedelta(days=DELAI_CADRAGE_JOURS)},
    )
    if not creee:
        return phase

    tracer(
        mission,
        ActionHistorique.PHASE_OUVERTE,
        details=f"Phase de cadrage ouverte, à livrer avant le {phase.date_limite:%d/%m/%Y}.",
    )
    freelance = freelance_assigne(mission)
    if freelance:
        notifier(
            utilisateur=freelance.user,
            type_notif="CADRAGE_A_LIVRER",
            titre="Cadrage à livrer",
            message=(
                f'Vous avez jusqu\'au {phase.date_limite:%d/%m/%Y} pour livrer le cadrage '
                f'de la mission "{mission.title}". Échangez avec l\'annonceur via le chat '
                "pour recueillir ses attentes."
            ),
            mission=mission,
        )
    return phase


# ---------------------------------------------------------------------------
# Livrables
# ---------------------------------------------------------------------------


@transaction.atomic
def soumettre_livrable(mission, user, titre, lien, description=""):
    _verifier_mission_active(mission)
    if not est_freelance_de(user, mission):
        raise PermissionError("Seul le freelance assigné peut soumettre un livrable.")

    phase = phase_en_cours(mission)
    if phase is None:
        raise SuiviError("Aucune phase n'est ouverte pour cette mission.")

    if phase.type == TypePhase.CADRAGE and phase.livrables.filter(
        statut__in=[StatutLivrable.A_VALIDER, StatutLivrable.VALIDE]
    ).exists():
        raise SuiviError(
            "Un cadrage est déjà en attente de validation ou validé pour cette mission."
        )

    livrable = Livrable.objects.create(
        phase=phase,
        freelance=freelance_assigne(mission),
        titre=titre,
        lien=lien,
        description=description or "",
    )
    tracer(
        mission,
        ActionHistorique.LIVRABLE_SOUMIS,
        auteur=user,
        details=f'{phase.get_type_display()} : "{livrable.titre}" ({livrable.lien})',
    )
    notifier(
        utilisateur=mission.annonceur.user,
        type_notif="LIVRABLE_SOUMIS",
        titre="Nouveau livrable à examiner",
        message=f'Le freelance a soumis "{livrable.titre}" pour la mission "{mission.title}".',
        mission=mission,
    )
    return livrable


def _verrouiller_livrable_a_examiner(livrable, user):
    livrable = Livrable.objects.select_for_update().select_related(
        "phase__mission__annonceur__user", "freelance__user"
    ).get(pk=livrable.pk)
    mission = livrable.phase.mission
    _verifier_mission_active(mission)
    if not est_annonceur_de(user, mission):
        raise PermissionError("Seul l'annonceur de la mission peut examiner ce livrable.")
    if livrable.statut != StatutLivrable.A_VALIDER:
        raise SuiviError("Ce livrable a déjà été examiné.")
    return livrable


@transaction.atomic
def valider_livrable(livrable, user, texte="", fichier_vocal=None):
    """Validation : commentaire facultatif. Valider le cadrage ouvre la phase 2."""
    livrable = _verrouiller_livrable_a_examiner(livrable, user)
    mission = livrable.phase.mission

    livrable.statut = StatutLivrable.VALIDE
    livrable.date_decision = timezone.now()
    livrable.save(update_fields=["statut", "date_decision"])
    _creer_commentaire(livrable, user, texte, fichier_vocal, obligatoire=False)
    tracer(mission, ActionHistorique.LIVRABLE_VALIDE, auteur=user, details=f'"{livrable.titre}"')

    message = f'Votre livrable "{livrable.titre}" a été validé.'
    if livrable.phase.type == TypePhase.CADRAGE:
        _ouvrir_phase_developpement(livrable.phase)
        message += " La phase de développement est ouverte."

    notifier(
        utilisateur=livrable.freelance.user,
        type_notif="LIVRABLE_VALIDE",
        titre="Livrable validé",
        message=message,
        mission=mission,
    )
    return livrable


def _ouvrir_phase_developpement(phase_cadrage):
    mission = phase_cadrage.mission
    phase_cadrage.statut = StatutPhase.VALIDEE
    phase_cadrage.save(update_fields=["statut"])
    tracer(mission, ActionHistorique.PHASE_VALIDEE, details="Cadrage validé par l'annonceur.")

    prop = proposition_acceptee(mission)
    date_limite = prop.date_livraison if prop else mission.date_deadline
    Phase.objects.get_or_create(
        mission=mission,
        type=TypePhase.DEVELOPPEMENT,
        defaults={"date_limite": date_limite},
    )
    tracer(mission, ActionHistorique.PHASE_OUVERTE, details="Phase de développement ouverte.")


@transaction.atomic
def invalider_livrable(livrable, user, texte="", fichier_vocal=None):
    """Invalidation (ou refus du cadrage) : commentaire obligatoire, texte ou vocal."""
    livrable = _verrouiller_livrable_a_examiner(livrable, user)
    mission = livrable.phase.mission

    _creer_commentaire(livrable, user, texte, fichier_vocal, obligatoire=True)
    livrable.statut = StatutLivrable.INVALIDE
    livrable.date_decision = timezone.now()
    livrable.save(update_fields=["statut", "date_decision"])
    tracer(mission, ActionHistorique.LIVRABLE_INVALIDE, auteur=user, details=f'"{livrable.titre}"')

    notifier(
        utilisateur=livrable.freelance.user,
        type_notif="LIVRABLE_INVALIDE",
        titre="Livrable à retravailler",
        message=(
            f'Votre livrable "{livrable.titre}" a été invalidé. Consultez le commentaire '
            "de l'annonceur, réadaptez puis resoumettez."
        ),
        mission=mission,
    )
    return livrable


# ---------------------------------------------------------------------------
# Retard de cadrage : décisions humaines
# ---------------------------------------------------------------------------


@transaction.atomic
def repousser_deadline_cadrage(mission, user, nouvelle_date):
    _verifier_mission_active(mission)
    if not est_annonceur_de(user, mission):
        raise PermissionError("Seul l'annonceur de la mission peut repousser la deadline.")

    phase = mission.phases.select_for_update().filter(
        type=TypePhase.CADRAGE, statut=StatutPhase.EN_COURS
    ).first()
    if phase is None:
        raise SuiviError("Aucun cadrage en cours pour cette mission.")
    if nouvelle_date <= timezone.localdate():
        raise SuiviError("La nouvelle deadline doit être postérieure à aujourd'hui.")

    ancienne = phase.date_limite
    phase.date_limite = nouvelle_date
    phase.retard_notifie = False
    phase.save(update_fields=["date_limite", "retard_notifie"])
    tracer(
        mission,
        ActionHistorique.DEADLINE_REPOUSSEE,
        auteur=user,
        details=f"Du {ancienne:%d/%m/%Y} au {nouvelle_date:%d/%m/%Y}." if ancienne else "",
    )
    freelance = freelance_assigne(mission)
    if freelance:
        notifier(
            utilisateur=freelance.user,
            type_notif="DEADLINE_REPOUSSEE",
            titre="Nouvelle deadline de cadrage",
            message=f'Le cadrage de "{mission.title}" est à livrer avant le {nouvelle_date:%d/%m/%Y}.',
            mission=mission,
        )
    return phase


@transaction.atomic
def relancer(mission, admin_user, destinataire, message=""):
    """Relance envoyée par l'admin au freelance (cadrage) ou à l'annonceur (validation)."""
    if not est_admin(admin_user):
        raise PermissionError("Seul un administrateur peut envoyer une relance.")
    _verifier_mission_active(mission)

    if destinataire == "freelance":
        freelance = freelance_assigne(mission)
        if freelance is None:
            raise SuiviError("Aucun freelance assigné à cette mission.")
        cible = freelance.user
        defaut = f'Merci de livrer votre travail pour la mission "{mission.title}".'
    elif destinataire == "annonceur":
        cible = mission.annonceur.user
        defaut = f'Des livrables de la mission "{mission.title}" attendent votre examen.'
    else:
        raise SuiviError('Destinataire invalide : "freelance" ou "annonceur".')

    texte = (message or "").strip() or defaut
    notifier(
        utilisateur=cible,
        type_notif="RELANCE_SUIVI",
        titre="Relance de l'équipe TerangaWork",
        message=texte,
        mission=mission,
    )
    tracer(mission, ActionHistorique.RELANCE, auteur=admin_user, details=f"{destinataire} : {texte}")


# ---------------------------------------------------------------------------
# Annulation : l'annonceur demande, l'admin décide
# ---------------------------------------------------------------------------


@transaction.atomic
def demander_annulation(mission, user):
    if not est_annonceur_de(user, mission):
        raise PermissionError("Seul l'annonceur de la mission peut demander son annulation.")
    if mission.status not in (MissionStatus.IN_PROGRESS, MissionStatus.DELIVERED):
        raise SuiviError(
            f"Une annulation ne peut être demandée que pour une mission en cours (statut : {mission.status})."
        )
    if mission.demandes_annulation.filter(statut=StatutDemandeAnnulation.EN_ATTENTE).exists():
        raise SuiviError("Une demande d'annulation est déjà en attente pour cette mission.")

    demande = DemandeAnnulation.objects.create(mission=mission, annonceur=mission.annonceur)
    tracer(mission, ActionHistorique.ANNULATION_DEMANDEE, auteur=user)
    for admin_user in admins().distinct():
        notifier(
            utilisateur=admin_user,
            type_notif="DEMANDE_ANNULATION",
            titre="Demande d'annulation à examiner",
            message=f'L\'annonceur demande l\'annulation de la mission "{mission.title}".',
            mission=mission,
        )
    return demande


@transaction.atomic
def decider_annulation(demande, admin_user, decision):
    if not est_admin(admin_user):
        raise PermissionError("Seul un administrateur peut décider d'une annulation.")
    demande = DemandeAnnulation.objects.select_for_update().select_related(
        "mission__annonceur__user"
    ).get(pk=demande.pk)
    if demande.statut != StatutDemandeAnnulation.EN_ATTENTE:
        raise SuiviError("Cette demande a déjà été traitée.")

    mission = demande.mission
    demande.decide_par = admin_user
    demande.date_decision = timezone.now()

    if decision == "accepter":
        if mission.status not in (MissionStatus.IN_PROGRESS, MissionStatus.DELIVERED):
            raise SuiviError(
                f"La mission ne peut plus être annulée (statut : {mission.status})."
            )
        demande.statut = StatutDemandeAnnulation.ACCEPTEE
        demande.save(update_fields=["statut", "decide_par", "date_decision"])
        mission.status = MissionStatus.CANCELLED
        mission.save(update_fields=["status", "updated_at"])
        tracer(mission, ActionHistorique.ANNULATION_ACCEPTEE, auteur=admin_user)
        notifier_mission_annulee(mission, mission.annonceur.user)
        freelance = freelance_assigne(mission)
        if freelance:
            notifier_mission_annulee(mission, freelance.user)
    elif decision == "refuser":
        demande.statut = StatutDemandeAnnulation.REFUSEE
        demande.save(update_fields=["statut", "decide_par", "date_decision"])
        tracer(mission, ActionHistorique.ANNULATION_REFUSEE, auteur=admin_user)
        notifier(
            utilisateur=mission.annonceur.user,
            type_notif="ANNULATION_REFUSEE",
            titre="Annulation refusée",
            message=(
                f'Votre demande d\'annulation de la mission "{mission.title}" a été refusée '
                "par l'administration. La collaboration continue."
            ),
            mission=mission,
        )
    else:
        raise SuiviError('Décision invalide : "accepter" ou "refuser".')
    return demande


# ---------------------------------------------------------------------------
# Détection des retards (lancée périodiquement, ne décide rien)
# ---------------------------------------------------------------------------


def detecter_retards(aujourd_hui=None, maintenant=None):
    aujourd_hui = aujourd_hui or timezone.localdate()
    maintenant = maintenant or timezone.now()
    liste_admins = list(admins().distinct())
    nb_cadrage = nb_validation = 0

    # 1. Cadrage non livré après la deadline -> admin + annonceur notifiés.
    phases = Phase.objects.select_related("mission__annonceur__user").filter(
        type=TypePhase.CADRAGE,
        statut=StatutPhase.EN_COURS,
        retard_notifie=False,
        date_limite__lt=aujourd_hui,
        mission__status=MissionStatus.IN_PROGRESS,
    )
    for phase in phases:
        if phase.livrables.filter(
            statut__in=[StatutLivrable.A_VALIDER, StatutLivrable.VALIDE]
        ).exists():
            continue
        mission = phase.mission
        with transaction.atomic():
            phase.retard_notifie = True
            phase.save(update_fields=["retard_notifie"])
            tracer(
                mission,
                ActionHistorique.RETARD_CADRAGE,
                details=f"Deadline du {phase.date_limite:%d/%m/%Y} dépassée sans cadrage livré.",
            )
            for destinataire in liste_admins + [mission.annonceur.user]:
                notifier(
                    utilisateur=destinataire,
                    type_notif="RETARD_CADRAGE",
                    titre="Cadrage en retard",
                    message=(
                        f'Le cadrage de la mission "{mission.title}" n\'a pas été livré '
                        f"avant le {phase.date_limite:%d/%m/%Y}."
                    ),
                    mission=mission,
                )
        nb_cadrage += 1

    # 2. Livrable sans réponse de l'annonceur -> admin notifié (il relance).
    limite = maintenant - timedelta(days=DELAI_VALIDATION_JOURS)
    livrables = Livrable.objects.select_related("phase__mission").filter(
        statut=StatutLivrable.A_VALIDER,
        retard_validation_notifie=False,
        date_soumission__lt=limite,
        phase__mission__status=MissionStatus.IN_PROGRESS,
    )
    for livrable in livrables:
        mission = livrable.phase.mission
        with transaction.atomic():
            livrable.retard_validation_notifie = True
            livrable.save(update_fields=["retard_validation_notifie"])
            tracer(
                mission,
                ActionHistorique.RETARD_VALIDATION,
                details=f'"{livrable.titre}" sans réponse depuis plus de {DELAI_VALIDATION_JOURS} jours.',
            )
            for admin_user in liste_admins:
                notifier(
                    utilisateur=admin_user,
                    type_notif="RETARD_VALIDATION",
                    titre="Livrable sans réponse",
                    message=(
                        f'Le livrable "{livrable.titre}" de la mission "{mission.title}" '
                        f"attend une réponse de l'annonceur depuis plus de {DELAI_VALIDATION_JOURS} jours."
                    ),
                    mission=mission,
                )
        nb_validation += 1

    return {"retards_cadrage": nb_cadrage, "retards_validation": nb_validation}
