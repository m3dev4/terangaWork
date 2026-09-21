from datetime import date
import logging
import httpx
from django.conf import settings
from freelance.models import Freelancee
from mission.models import Mission, MissionStatus
from proposition.models import Proposition, PropositionStatus
from matching.models import ResultatMatching

logger = logging.getLogger(__name__)


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
        with httpx.Client(timeout=15.0) as client:
            response = client.post(endpoint, json=payload, headers=headers)

        if response.status_code != 200:
            logger.error(
                f"Le microservice FastAPI a répondu avec l'erreur HTTP {response.status_code}: {response.text}"
            )
            raise MatchingServiceUnavailableError("Le service de matching a renvoyé une erreur.")

        return response.json()

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
        .select_related("freelance", "freelance__user", "freelance__service")
        .prefetch_related("freelance__technologies", "freelance__experiences")
    )

    if not propositions:
        return {"resultats": [], "etage_2_reussi": True}

    candidats_payload = []
    prop_map: dict[int, Proposition] = {}

    for prop in propositions:
        prop_map[prop.id] = prop
        exp_years = get_freelance_experience_years(prop.freelance)
        cand_techs = [t.name for t in prop.freelance.technologies.all()]
        cand_service = prop.freelance.service.name if prop.freelance.service else ""
        texte_libre = (
            f"Lettre de motivation: {prop.lettre_motivation}\n"
            f"Profil Freelance: {prop.freelance.title} - {prop.freelance.description}"
        )

        candidats_payload.append(
            {
                "id": prop.id,
                "technologies": cand_techs,
                "service": cand_service,
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


def process_missions_recommandees(freelance: Freelancee) -> dict:
    """
    Rassemble les missions ouvertes, appelle le microservice, persiste et enrichit le résultat.
    """
    contexte = f"Profil Freelance: {freelance.title}\nDescription: {freelance.description}"
    technologies = [t.name for t in freelance.technologies.all()]
    service = freelance.service.name if freelance.service else ""

    missions = list(
        Mission.objects.filter(status=MissionStatus.OPEN)
        .exclude(propositions__proposition_status=PropositionStatus.ACCEPTED)
        .select_related("service", "annonceur", "annonceur__user")
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
        m = mission_map.get(cand_id)
        if not m:
            continue

        annonceur_user = m.annonceur.user
        annonceur_nom = f"{annonceur_user.first_name} {annonceur_user.last_name}".strip()

        # Persistance en BD
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
