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


def calculate_service_score(candidat_service: str, target_service: str) -> float:
    """
    Correspondance binaire (1..1) entre le service du candidat et le service cible.
    """
    if candidat_service.strip().lower() == target_service.strip().lower():
        return 1.0
    return 0.0


def calculate_technologies_score(
    candidat_techs: list[str], target_techs: list[str]
) -> float:
    """
    Chevauchement des technologies (ratio d'intersection par rapport au besoin cible).
    """
    normalized_target = {t.strip().lower() for t in target_techs if t.strip()}
    if not normalized_target:
        normalized_candidat = {t.strip().lower() for t in candidat_techs if t.strip()}
        return 1.0 if not normalized_candidat else 0.0

    normalized_candidat = {t.strip().lower() for t in candidat_techs if t.strip()}
    common = normalized_candidat & normalized_target
    return len(common) / len(normalized_target)


def compute_stage_1(request: MatchingRequestSchema) -> list[ResultatCandidatSchema]:
    """
    Étage 1 — Scoring pondéré déterministe.
    Trie tous les candidats par score décroissant et renvoie le top_n.
    """
    results: list[ResultatCandidatSchema] = []

    for candidat in request.candidats:
        score_tech = calculate_technologies_score(
            candidat.technologies, request.technologies
        )
        score_serv = calculate_service_score(candidat.service, request.service)
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
