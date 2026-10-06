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


def calculate_service_score(candidat_service: str | None, target_service: str | None) -> float:
    """
    Correspondance binaire (1..1) entre le service du candidat et le service cible.
    """
    c_serv = (candidat_service or "").strip().lower()
    t_serv = (target_service or "").strip().lower()
    if not t_serv:
        return 1.0
    if c_serv == t_serv:
        return 1.0
    return 0.0


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
        score_serv = calculate_service_score(candidat.service, request.service)
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
