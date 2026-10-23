"""
Contexte complet d'un utilisateur pour l'assistant IA.

Le microservice FastAPI reçoit ici, en un seul appel, tout ce que l'utilisateur
a le droit de voir : profil, missions, candidatures, suivi (phases, livrables,
retards), paiements, rendez-vous, notifications, ainsi que des indicateurs
déjà calculés (gains, taux d'acceptation, complétude du profil...).

Les chiffres sont calculés ici, en base, et non par le LLM : il n'a qu'à les
lire, ce qui évite les erreurs de calcul et les hallucinations.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from announcer.models import Announcer
from freelance.models import Freelancee
from matching.models import ResultatMatching
from message.models import Message
from mission.models import Mission
from notification.models import Notification
from paiement.models import Paiement, StatutCollecte, StatutDecaissement
from proposition.models import ProjectMeeting, Proposition, PropositionStatus
from suivi.models import Livrable, StatutLivrable

MAX_ELEMENTS = 15  # par liste, pour borner la taille du prompt


def _montant(valeur) -> float:
    return float(valeur or Decimal("0"))


def _date(valeur):
    return valeur.isoformat() if valeur else None


def _somme(qs, champ) -> float:
    return _montant(qs.aggregate(total=Sum(champ))["total"])


# ---------------------------------------------------------------------------
# Blocs communs
# ---------------------------------------------------------------------------
def _suivi_mission(mission: Mission) -> dict:
    phases = []
    for phase in mission.phases.all().order_by("date_ouverture"):
        livrables = phase.livrables.all().order_by("-date_soumission")
        phases.append(
            {
                "type": phase.get_type_display(),
                "statut": phase.get_statut_display(),
                "date_limite": _date(phase.date_limite),
                "en_retard": bool(
                    phase.date_limite
                    and phase.statut == "EN_COURS"
                    and phase.date_limite < timezone.localdate()
                ),
                "livrables": [
                    {
                        "titre": l.titre,
                        "statut": l.get_statut_display(),
                        "date_soumission": _date(l.date_soumission),
                        "date_decision": _date(l.date_decision),
                        "dernier_commentaire": next(
                            (
                                c.texte or "(message vocal)"
                                for c in l.commentaires.all().order_by("-date_creation")[:1]
                            ),
                            None,
                        ),
                    }
                    for l in livrables[:MAX_ELEMENTS]
                ],
            }
        )
    annulation = mission.demandes_annulation.order_by("-date_demande").first()
    return {
        "phases": phases,
        "demande_annulation": (
            {"statut": annulation.get_statut_display(), "date": _date(annulation.date_demande)}
            if annulation
            else None
        ),
    }


def _paiement_dict(p: Paiement) -> dict:
    prop = p.proposition
    return {
        "mission": prop.mission.title,
        "mission_id": prop.mission_id,
        "montant_brut": _montant(p.montant_brut),
        "commission": _montant(p.montant_commission),
        "taux_commission_pct": round(float(p.taux_commission) * 100, 1),
        "montant_net_freelance": _montant(p.montant_net),
        "statut_paiement_annonceur": p.get_statut_collecte_display(),
        "statut_versement_freelance": p.get_statut_decaissement_display(),
        "date_paiement": _date(p.date_collecte),
        "date_versement": _date(p.date_decaissement),
    }


def _rendez_vous(missions_qs) -> list:
    aujourd_hui = timezone.localdate()
    qs = (
        ProjectMeeting.objects.filter(mission__in=missions_qs, date__gte=aujourd_hui)
        .select_related("mission")
        .order_by("date", "time")[:MAX_ELEMENTS]
    )
    return [
        {"titre": m.title, "mission": m.mission.title, "date": _date(m.date), "heure": m.time.strftime("%H:%M")}
        for m in qs
    ]


def _notifications(user) -> dict:
    qs = Notification.objects.filter(utilisateur=user).order_by("-date_creation")
    return {
        "non_lues": qs.filter(lue=False).count(),
        "dernieres": [
            {"titre": n.titre, "message": n.message, "lue": n.lue, "date": _date(n.date_creation)}
            for n in qs[:8]
        ],
    }


def _messages_non_lus(user) -> int:
    return Message.objects.filter(destinataire=user).exclude(lectures__utilisateur=user).count()


# ---------------------------------------------------------------------------
# Freelance
# ---------------------------------------------------------------------------
def _completude_profil(freelance: Freelancee) -> dict:
    criteres = {
        "photo_de_profil": bool(freelance.user.profile_picture),
        "titre": bool(freelance.title),
        "description_detaillee": len(freelance.description or "") >= 150,
        "au_moins_3_technologies": freelance.technologies.count() >= 3,
        "service": freelance.services.exists(),
        "experience": freelance.experiences.exists(),
        "formation": freelance.educations.exists(),
        "realisations_portfolio": freelance.realisations.exists(),
        "github": bool(freelance.githubUrl),
        "linkedin": bool(freelance.linkedinUrl),
    }
    remplis = sum(criteres.values())
    return {
        "pourcentage": round(100 * remplis / len(criteres)),
        "elements_manquants": [k for k, ok in criteres.items() if not ok],
    }


def contexte_freelance(user) -> dict:
    freelance = (
        Freelancee.objects.filter(user=user)
        .prefetch_related("technologies", "services", "experiences", "educations", "realisations")
        .first()
    )
    if not freelance:
        return {"profil": None, "note": "Profil freelance non créé."}

    maintenant = timezone.now()
    il_y_a_30j = maintenant - timedelta(days=30)

    # --- Profil -----------------------------------------------------------
    profil = {
        "nom": f"{user.first_name} {user.last_name}".strip(),
        "titre": freelance.title,
        "description": freelance.description,
        "services": [s.name for s in freelance.services.all()],
        "technologies": [t.name for t in freelance.technologies.all()],
        "experiences": [
            {"poste": e.poste, "entreprise": e.entreprise, "debut": _date(e.startDate),
             "fin": _date(e.endDate), "en_cours": e.current}
            for e in freelance.experiences.all()
        ],
        "formations": [
            {"nom": f.nom, "etablissement": f.etablissement, "type": f.get_role_display()}
            for f in freelance.educations.all()
        ],
        "realisations": [{"titre": r.title, "lien": r.link} for r in freelance.realisations.all()],
        "github": freelance.githubUrl or None,
        "linkedin": freelance.linkedinUrl or None,
        "inscrit_depuis": _date(user.date_joined),
        "completude": _completude_profil(freelance),
    }

    # --- Candidatures -----------------------------------------------------
    props = (
        Proposition.objects.filter(freelance=freelance)
        .select_related("mission", "mission__service")
        .order_by("-created_at")
    )
    scores = {
        r.proposition_id: r
        for r in ResultatMatching.objects.filter(proposition__in=props).order_by("date_calcul")
    }
    candidatures = []
    for p in props[:MAX_ELEMENTS]:
        r = scores.get(p.id)
        candidatures.append(
            {
                "id": p.id,
                "statut": p.get_proposition_status_display(),
                "date_candidature": _date(p.created_at),
                "date_livraison_proposee": _date(p.date_livraison),
                "score_matching_pct": round(r.score * 100) if r else None,
                "mission": {
                    "id": p.mission_id,
                    "title": p.mission.title,
                    "budget_fcfa": p.mission.budget,
                    "service": p.mission.service.name if p.mission.service_id else None,
                    "statut": p.mission.get_status_display(),
                },
            }
        )
    total_cand = props.count()
    acceptees = props.filter(proposition_status=PropositionStatus.ACCEPTED).count()
    refusees = props.filter(proposition_status=PropositionStatus.REJECTED).count()

    # --- Missions obtenues + suivi ---------------------------------------
    missions_qs = (
        Mission.objects.filter(
            propositions__freelance=freelance,
            propositions__proposition_status=PropositionStatus.ACCEPTED,
        )
        .select_related("annonceur__user", "service")
        .prefetch_related("phases__livrables__commentaires")
        .distinct()
        .order_by("-created_at")
    )
    missions = [
        {
            "id": m.id,
            "title": m.title,
            "statut": m.get_status_display(),
            "budget_fcfa": m.budget,
            "annonceur": f"{m.annonceur.user.first_name} {m.annonceur.user.last_name}".strip(),
            "deadline": _date(m.date_deadline),
            "suivi": _suivi_mission(m),
        }
        for m in missions_qs[:MAX_ELEMENTS]
    ]

    # --- Gains ------------------------------------------------------------
    paiements = Paiement.objects.filter(proposition__freelance=freelance).select_related("proposition__mission")
    verses = paiements.filter(statut_decaissement=StatutDecaissement.REUSSI)
    a_venir = paiements.filter(statut_collecte=StatutCollecte.REUSSI).exclude(
        statut_decaissement=StatutDecaissement.REUSSI
    )
    gains = {
        "devise": "FCFA",
        "total_gagne_net": _somme(verses, "montant_net"),
        "gagne_30_derniers_jours": _somme(verses.filter(date_decaissement__gte=il_y_a_30j), "montant_net"),
        "gagne_ce_mois": _somme(
            verses.filter(date_decaissement__year=maintenant.year, date_decaissement__month=maintenant.month),
            "montant_net",
        ),
        "en_attente_de_versement": _somme(a_venir, "montant_net"),
        "commissions_payees": _somme(verses, "montant_commission"),
        "nombre_missions_payees": verses.count(),
        "detail": [_paiement_dict(p) for p in paiements.order_by("-created_at")[:MAX_ELEMENTS]],
    }

    livrables_en_attente = Livrable.objects.filter(
        freelance=freelance, statut=StatutLivrable.A_VALIDER
    ).count()
    livrables_a_reprendre = Livrable.objects.filter(
        freelance=freelance, statut=StatutLivrable.INVALIDE
    ).count()

    return {
        "date_du_jour": _date(timezone.localdate()),
        "profil": profil,
        "statistiques": {
            "candidatures_envoyees": total_cand,
            "candidatures_acceptees": acceptees,
            "candidatures_refusees": refusees,
            "candidatures_en_attente": total_cand - acceptees - refusees,
            "taux_acceptation_pct": round(100 * acceptees / total_cand) if total_cand else None,
            "missions_en_cours": missions_qs.filter(status="IN_PROGRESS").count(),
            "missions_terminees": missions_qs.filter(status="COMPLETED").count(),
            "livrables_en_attente_de_validation": livrables_en_attente,
            "livrables_invalides_a_reprendre": livrables_a_reprendre,
            "messages_non_lus": _messages_non_lus(user),
        },
        "gains": gains,
        "candidatures": candidatures,
        "missions_obtenues": missions,
        "prochains_rendez_vous": _rendez_vous(missions_qs),
        "notifications": _notifications(user),
    }


# ---------------------------------------------------------------------------
# Annonceur
# ---------------------------------------------------------------------------
def contexte_annonceur(user) -> dict:
    annonceur = Announcer.objects.filter(user=user).first()
    if not annonceur:
        return {"profil": None, "note": "Profil annonceur non créé."}

    maintenant = timezone.now()
    missions_qs = (
        Mission.objects.filter(annonceur=annonceur)
        .select_related("service")
        .prefetch_related("technologies", "phases__livrables__commentaires")
        .annotate(
            nb_candidatures=Count("propositions", distinct=True),
            nb_en_attente=Count(
                "propositions",
                filter=Q(propositions__proposition_status=PropositionStatus.PENDING),
                distinct=True,
            ),
        )
        .order_by("-created_at")
    )

    missions = []
    for m in missions_qs[:MAX_ELEMENTS]:
        acceptee = (
            m.propositions.filter(proposition_status=PropositionStatus.ACCEPTED)
            .select_related("freelance__user")
            .first()
        )
        missions.append(
            {
                "id": m.id,
                "title": m.title,
                "statut": m.get_status_display(),
                "budget_fcfa": m.budget,
                "service": m.service.name if m.service_id else None,
                "technologies": [t.name for t in m.technologies.all()],
                "deadline": _date(m.date_deadline),
                "publiee_le": _date(m.created_at),
                "nb_candidatures": m.nb_candidatures,
                "nb_candidatures_en_attente": m.nb_en_attente,
                "freelance_retenu": (
                    f"{acceptee.freelance.user.first_name} {acceptee.freelance.user.last_name}".strip()
                    if acceptee
                    else None
                ),
                "longueur_description": len(m.description or ""),
                "suivi": _suivi_mission(m) if acceptee else None,
            }
        )

    paiements = Paiement.objects.filter(proposition__mission__annonceur=annonceur).select_related(
        "proposition__mission"
    )
    payes = paiements.filter(statut_collecte=StatutCollecte.REUSSI)

    return {
        "date_du_jour": _date(timezone.localdate()),
        "profil": {
            "nom": f"{user.first_name} {user.last_name}".strip(),
            "type": annonceur.get_typeAnnonceur_display() if annonceur.typeAnnonceur else None,
            "entreprise": annonceur.company_name or None,
            "secteur": annonceur.company_secteur or None,
            "inscrit_depuis": _date(user.date_joined),
        },
        "statistiques": {
            "missions_publiees": missions_qs.count(),
            "missions_ouvertes": missions_qs.filter(status="OPEN").count(),
            "missions_en_cours": missions_qs.filter(status="IN_PROGRESS").count(),
            "missions_terminees": missions_qs.filter(status="COMPLETED").count(),
            "missions_en_moderation": missions_qs.filter(status="PENDING_MODERATION").count(),
            "candidatures_recues_total": Proposition.objects.filter(mission__annonceur=annonceur).count(),
            "candidatures_a_traiter": Proposition.objects.filter(
                mission__annonceur=annonceur, proposition_status=PropositionStatus.PENDING
            ).count(),
            "livrables_a_valider": Livrable.objects.filter(
                phase__mission__annonceur=annonceur, statut=StatutLivrable.A_VALIDER
            ).count(),
            "messages_non_lus": _messages_non_lus(user),
        },
        "depenses": {
            "devise": "FCFA",
            "total_depense": _somme(payes, "montant_brut"),
            "depense_ce_mois": _somme(
                payes.filter(date_collecte__year=maintenant.year, date_collecte__month=maintenant.month),
                "montant_brut",
            ),
            "dont_commissions_plateforme": _somme(payes, "montant_commission"),
            "detail": [_paiement_dict(p) for p in paiements.order_by("-created_at")[:MAX_ELEMENTS]],
        },
        "missions": missions,
        "prochains_rendez_vous": _rendez_vous(missions_qs),
        "notifications": _notifications(user),
    }
