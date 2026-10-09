from app.schemas import CandidatSchema, MatchingRequestSchema, ResultatCandidatSchema


def min_max_experience_score(annees_experience: int | None) -> float | None:
    """
    Calcule le score d'expérience :
    - min(annees_experience / 5, 1.0) si renseignée
    - None si non renseignée (None)
    """
    if annees_experience is None:
        return None
    return min(float(annees_experience) / 5.0, 1.0)


def calculate_service_score(
    candidat_service: str | list[str] | None,
    target_service: str | list[str] | None
) -> float:
    """
    Correspondance entre les services du candidat et le service cible.
    - Si candidat a plusieurs services (list), renvoie 1.0 si AU MOINS UN correspond
    - Si target a plusieurs services (list), renvoie 1.0 si AU MOINS UN est couvert
    """
    # Normaliser en ensembles (lowercase, strip)
    c_services = {
        s.strip().lower()
        for s in (candidat_service if isinstance(candidat_service, list) else [candidat_service])
        if s and s.strip()
    }
    t_services = {
        s.strip().lower()
        for s in (target_service if isinstance(target_service, list) else [target_service])
        if s and s.strip()
    }

    if not t_services:
        # Aucun service cible : score maximum
        return 1.0
    if not c_services:
        # Pas de service candidat : score nul
        return 0.0

    # Score = 1.0 si AU MOINS UN service en commun (intersection non vide)
    return 1.0 if bool(c_services & t_services) else 0.0


def calculate_technologies_score(
    candidat_techs: list[str] | None, target_techs: list[str] | None
) -> float:
    """
    Chevauchement des technologies (ratio d'intersection par rapport au besoin cible).
    """
    normalized_target = {t.strip().lower() for t in (target_techs or []) if t and t.strip()}
    if not normalized_target:
        # Aucune exigence technique : aucune compétence manquante.
        return 1.0

    normalized_candidat = {t.strip().lower() for t in (candidat_techs or []) if t and t.strip()}
    common = normalized_candidat & normalized_target
    return len(common) / len(normalized_target)


def compute_stage_1(request: MatchingRequestSchema) -> list[ResultatCandidatSchema]:
    """
    Étage 1 — Scoring pondéré déterministe.
    Trie tous les candidats par score décroissant et renvoie le top_n.
    """
    results: list[ResultatCandidatSchema] = []

# contient les critères recherchés, les candidats et le nombre de résultats à conserver.
    for candidat in request.candidats:
        # Le dénominateur est toujours le besoin de la mission, quel que soit
        # le sens de la recommandation. Les compétences supplémentaires du
        # freelance ne doivent jamais faire baisser son score.
        freelance_techs, mission_techs = (
            (request.technologies, candidat.technologies)
            if request.type_matching == "missions"
            else (candidat.technologies, request.technologies)
        )
        score_tech = calculate_technologies_score(
            freelance_techs, mission_techs
        )
        candidat_services = candidat.services or candidat.service
        target_services = request.services or request.service
        freelance_services, mission_services = (
            (target_services, candidat_services)
            if request.type_matching == "missions"
            else (candidat_services, target_services)
        )
        score_serv = calculate_service_score(freelance_services, mission_services)
        if score_tech < request.min_technology_score:
            continue
        score_exp = min_max_experience_score(candidat.annees_experience)

        if score_exp is None:
            # 50% tech, 50% service si expérience absente
            final_score = 0.50 * score_tech + 0.50 * score_serv
        else:
            # 45% tech, 45% service, 10% expérience
            final_score = 0.45 * score_tech + 0.45 * score_serv + 0.10 * score_exp

        results.append(
            ResultatCandidatSchema(
                candidat_id=candidat.id,
                score=round(final_score, 4),
                score_technologies=round(score_tech, 4),
                score_service=round(score_serv, 4),
                score_experience=round(score_exp, 4) if score_exp is not None else None,
                justification_ia=None,
            )
        )

    # Tri déterministe par score décroissant, puis par candidat_id croissant pour départager
    results.sort(key=lambda r: (r.score, -r.candidat_id), reverse=True)

    # Ne garder que le top N
    return results[: request.top_n]
