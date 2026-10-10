from datetime import date
import logging
import httpx
from django.conf import settings
from freelance.models import Freelancee
from mission.models import Mission, MissionStatus
from proposition.models import Proposition, PropositionStatus
from matching.models import ResultatMatching

logger = logging.getLogger(__name__)
MIN_MISSION_TECH_COVERAGE = 0.5
SEUIL_MATCHING_PROACTIF = 0.80


class MatchingServiceUnavailableError(Exception):
    """Exception levée en cas d'erreur de communication avec le microservice FastAPI."""
    pass


def get_freelance_experience_years(freelance: Freelancee) -> int | None:
    """
    Calcule le total des années d'expérience cumulées à partir des enregistrements Experience.
    Retourne None si le freelance n'a aucun enregistrement d'expérience.
    """
    experiences = list(freelance.experiences.all())
    if not experiences:
        return None

    total_days = 0
    today = date.today()

    for exp in experiences:
        start = exp.startDate
        if exp.current or not exp.endDate:
            end = today
        else:
            end = exp.endDate

        if end >= start:
            total_days += (end - start).days

    years = total_days / 365.25
    return max(0, round(years))


def call_fastapi_matching(payload: dict) -> dict:
    """
    Effectue l'appel synchrone HTTP vers le microservice FastAPI.
    """
    base_url = getattr(settings, "FASTAPI_MATCHING_URL", "http://localhost:8000").rstrip("/")
    api_key = getattr(settings, "FASTAPI_INTERNAL_API_KEY", "dev-secret-internal-key")
    endpoint = f"{base_url}/matching/score"

    headers = {
        "X-Internal-API-Key": api_key,
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(endpoint, json=payload, headers=headers)

        if response.status_code != 200:
            logger.error(
                f"Le microservice FastAPI a répondu avec l'erreur HTTP {response.status_code}: {response.text}"
            )
            raise MatchingServiceUnavailableError(
                f"Le service de matching a renvoyé HTTP {response.status_code}: {response.text}"
            )

        return response.json()

    except MatchingServiceUnavailableError:
        raise
    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.error(f"Échec de connexion vers le microservice FastAPI ({endpoint}): {e}")
        raise MatchingServiceUnavailableError("Impossible de contacter le service de matching.")


def process_candidats_recommandes(mission: Mission) -> dict:
    """
    Rassemble les candidats (propositions), appelle le microservice, persiste et enrichit le résultat.
    """
    contexte = f"Mission: {mission.title}\nDescription: {mission.description}"
    technologies = [t.name for t in mission.technologies.all()]
    service = mission.service.name if mission.service else ""

    propositions = list(
        Proposition.objects.filter(mission=mission)
        .select_related("freelance", "freelance__user")
        .prefetch_related("freelance__technologies", "freelance__experiences", "freelance__services")
    )

    if not propositions:
        return {"resultats": [], "etage_2_reussi": True}

    candidats_payload = []
    prop_map: dict[int, Proposition] = {}

    for prop in propositions:
        prop_map[prop.id] = prop
        exp_years = get_freelance_experience_years(prop.freelance)
        cand_techs = [t.name for t in prop.freelance.technologies.all()]
        cand_services = [s.name for s in prop.freelance.services.all()]
        texte_libre = (
            f"Lettre de motivation: {prop.lettre_motivation}\n"
            f"Profil Freelance: {prop.freelance.title} - {prop.freelance.description}"
        )

        candidats_payload.append(
            {
                "id": prop.id,
                "technologies": cand_techs,
                "services": cand_services,
                "annees_experience": exp_years,
                "texte_libre": texte_libre,
            }
        )

    payload = {
        "contexte": contexte,
        "technologies": technologies,
        "service": service,
        "candidats": candidats_payload,
        "top_n": 8,
    }

    fastapi_res = call_fastapi_matching(payload)
    etage_2_reussi = fastapi_res.get("etage_2_reussi", False)
    raw_results = fastapi_res.get("resultats", [])

    enriched_results = []
    for item in raw_results:
        cand_id = item["candidat_id"]
        prop = prop_map.get(cand_id)
        if not prop:
            continue

        freelance = prop.freelance
        user = freelance.user
        profile_picture_url = user.profile_picture.url if user.profile_picture else None

        # Persistance en BD
        ResultatMatching.objects.create(
            mission=mission,
            freelance=freelance,
            proposition=prop,
            score=item["score"],
            score_technologies=item["score_technologies"],
            score_service=item["score_service"],
            score_experience=item.get("score_experience"),
            justification_ia=item.get("justification_ia"),
        )

        enriched_results.append(
            {
                "candidat_id": cand_id,
                "proposition_id": prop.id,
                "freelance_id": freelance.id,
                "freelance_nom": f"{user.first_name} {user.last_name}".strip(),
                "freelance_titre": freelance.title,
                "freelance_picture": profile_picture_url,
                "lettre_motivation": prop.lettre_motivation,
                "date_livraison": str(prop.date_livraison),
                "score": item["score"],
                "score_technologies": item["score_technologies"],
                "score_service": item["score_service"],
                "score_experience": item.get("score_experience"),
                "justification_ia": item.get("justification_ia"),
            }
        )

    return {
        "resultats": enriched_results,
        "etage_2_reussi": etage_2_reussi,
    }


def process_missions_recommandees(freelance: Freelancee, *, scoring_only=False) -> dict:
    """
    Rassemble les missions ouvertes, appelle le microservice, persiste et enrichit le résultat.
    """
    contexte = f"Profil Freelance: {freelance.title}\nDescription: {freelance.description}"
    technologies = [t.name for t in freelance.technologies.all()]
    services = [s.name for s in freelance.services.all()]

    missions = list(
        Mission.objects.filter(status=MissionStatus.OPEN)
        .exclude(propositions__proposition_status=PropositionStatus.ACCEPTED)
        .select_related("service", "annonceur__user")
        .prefetch_related("technologies")
        .distinct()
    )

    if not missions:
        return {"resultats": [], "etage_2_reussi": True}

    candidats_payload = []
    mission_map: dict[int, Mission] = {}

    for m in missions:
        mission_map[m.id] = m
        m_techs = [t.name for t in m.technologies.all()]
        m_service = m.service.name if m.service else ""
        texte_libre = f"Titre: {m.title}\nDescription: {m.description}"

        candidats_payload.append(
            {
                "id": m.id,
                "technologies": m_techs,
                "service": m_service,
                "annees_experience": None,
                "texte_libre": texte_libre,
            }
        )

    payload = {
        "contexte": contexte,
        "technologies": technologies,
        "services": services,
        "candidats": candidats_payload,
        "top_n": len(missions) if scoring_only else 4,
        "type_matching": "missions",
        "scoring_only": scoring_only,
        "min_technology_score": 0.0 if scoring_only else MIN_MISSION_TECH_COVERAGE,
    }

    fastapi_res = call_fastapi_matching(payload)
    etage_2_reussi = fastapi_res.get("etage_2_reussi", False)
    raw_results = fastapi_res.get("resultats", [])

    enriched_results = []
    for item in raw_results:
        cand_id = item["candidat_id"]
        m = mission_map.get(cand_id)
        if not m:
            continue

        annonceur_user = m.annonceur.user
        annonceur_nom = f"{annonceur_user.first_name} {annonceur_user.last_name}".strip()

        # La consultation initiale ne crée pas d'historique de matching.
        if not scoring_only:
            ResultatMatching.objects.create(
                mission=m,
                freelance=freelance,
                proposition=None,
                score=item["score"],
                score_technologies=item["score_technologies"],
                score_service=item["score_service"],
                score_experience=item.get("score_experience"),
                justification_ia=item.get("justification_ia"),
            )

        enriched_results.append(
            {
                "candidat_id": cand_id,
                "mission_id": m.id,
                "compatible": item["score_technologies"] >= MIN_MISSION_TECH_COVERAGE,
                "mission_title": m.title,
                "mission_description": m.description,
                "mission_budget": m.budget,
                "mission_service": m.service.name if m.service else "",
                "mission_technologies": [t.name for t in m.technologies.all()],
                "annonceur_nom": annonceur_nom,
                "date_deadline": str(m.date_deadline) if m.date_deadline else None,
                "score": item["score"],
                "score_technologies": item["score_technologies"],
                "score_service": item["score_service"],
                "score_experience": item.get("score_experience"),
                "justification_ia": item.get("justification_ia"),
            }
        )

    return {
        "resultats": enriched_results,
        "etage_2_reussi": etage_2_reussi,
    }


def evaluer_matching_proactif(mission_id: int) -> None:
    """
    Évalue les freelances actifs par rapport à une mission validée (proactive matching).
    1. Étage 1 : scoring déterministe sur tous les freelances actifs.
    2. Filtrage des freelances ayant un score >= 80%.
    3. Étage 2 : un seul appel LLM groupé pour obtenir les justifications IA.
    4. Création des notifications (avec anti-doublon) via notifier().
    """
    try:
        mission = (
            Mission.objects.filter(pk=mission_id)
            .select_related("annonceur", "annonceur__user")
            .prefetch_related("technologies", "service")
            .first()
        )
        if not mission:
            logger.warning(f"Mission #{mission_id} introuvable pour le matching proactif.")
            return

        # Récupérer tous les freelances actifs avec leurs technologies, services et expériences
        freelances = list(
            Freelancee.objects.filter(user__is_active=True)
            .prefetch_related("technologies", "experiences", "services")
            .select_related("user")
        )

        if not freelances:
            logger.info("Aucun freelance actif trouvé pour le matching proactif.")
            return

        contexte = f"Mission: {mission.title}\nDescription: {mission.description}"
        technologies = [t.name for t in mission.technologies.all()]
        service = mission.service.name if mission.service else ""

        candidats_payload = []
        freelance_map: dict[int, Freelancee] = {}

        for f in freelances:
            freelance_map[f.id] = f
            exp_years = get_freelance_experience_years(f)
            cand_techs = [t.name for t in f.technologies.all()]
            cand_services = [s.name for s in f.services.all()]
            texte_libre = f"Profil Freelance: {f.title} - {f.description}".strip()

            candidats_payload.append(
                {
                    "id": f.id,
                    "technologies": cand_techs,
                    "services": cand_services,
                    "annees_experience": exp_years,
                    "texte_libre": texte_libre,
                }
            )

        # 1. Étage 1 : Scoring déterministe
        payload_stage1 = {
            "type_matching": "proactif",
            "scoring_only": True,
            "contexte": contexte,
            "technologies": technologies,
            "service": service,
            "candidats": candidats_payload,
            "top_n": len(candidats_payload),
            "min_technology_score": 0.0,
        }

        fastapi_res_stage1 = call_fastapi_matching(payload_stage1)
        raw_results_stage1 = fastapi_res_stage1.get("resultats", [])

        # 2. Filtrage des freelances dont le score dépasse 80% (score >= 0.80)
        candidats_qualifies = [
            item for item in raw_results_stage1
            if item.get("score", 0.0) >= SEUIL_MATCHING_PROACTIF
        ]

        if not candidats_qualifies:
            logger.info(
                f"Aucun freelance qualifié au seuil de {int(SEUIL_MATCHING_PROACTIF * 100)}% "
                f"pour la mission #{mission.id}."
            )
            return

        qualifies_ids = {item["candidat_id"] for item in candidats_qualifies}
        stage2_candidats_payload = [
            c for c in candidats_payload if c["id"] in qualifies_ids
        ]

        # 3. Étage 2 : Un seul appel LLM groupé pour tous les freelances qualifiés
        payload_stage2 = {
            "type_matching": "proactif",
            "scoring_only": False,
            "contexte": contexte,
            "technologies": technologies,
            "service": service,
            "candidats": stage2_candidats_payload,
            "top_n": len(stage2_candidats_payload),
            "min_technology_score": 0.0,
        }

        fastapi_res_stage2 = call_fastapi_matching(payload_stage2)
        raw_results_stage2 = fastapi_res_stage2.get("resultats", [])

        # 4. Anti-doublon et création des notifications
        from notification.models import Notification
        from notification.services import notifier

        for item in raw_results_stage2:
            freelance_id = item["candidat_id"]
            freelance = freelance_map.get(freelance_id)
            if not freelance or not freelance.user:
                continue

            # Vérifier qu'aucune notification MISSION_RECOMMANDEE n'existe déjà pour ce couple (freelance, mission)
            deja_notifie = Notification.objects.filter(
                utilisateur=freelance.user,
                mission=mission,
                type="MISSION_RECOMMANDEE",
            ).exists()

            if deja_notifie:
                logger.info(
                    f"Notification MISSION_RECOMMANDEE déjà envoyée à {freelance.user.email} "
                    f"pour la mission #{mission.id}."
                )
                continue

            score_val = item.get("score", 0.0)
            score_pct = int(round(score_val * 100))
            justification = item.get("justification_ia")
            message = (
                justification
                if justification
                else f'La mission "{mission.title}" correspond à votre profil avec un score de {score_pct}%.'
            )

            notifier(
                utilisateur=freelance.user,
                type_notif="MISSION_RECOMMANDEE",
                titre=f"Une mission vous correspond à {score_pct}%",
                message=message,
                mission=mission,
            )

    except MatchingServiceUnavailableError as e:
        logger.error(
            f"Matching proactif interrompu (service indisponible) pour la mission #{mission_id}: {e}"
        )
    except Exception as e:
        logger.exception(
            f"Erreur inattendue lors du matching proactif pour la mission #{mission_id}: {e}"
        )


def lancer_matching_proactif_async(mission_id: int):
    """
    Lance le matching proactif en arrière-plan (daemon thread) pour ne pas bloquer l'approbation de mission.
    """
    import threading

    thread = threading.Thread(
        target=evaluer_matching_proactif,
        args=(mission_id,),
        daemon=True,
    )
    thread.start()
    return thread
