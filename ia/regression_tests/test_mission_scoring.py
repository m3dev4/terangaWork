import pytest
import asyncio
from unittest.mock import AsyncMock, patch

from app.schemas import CandidatSchema, MatchingRequestSchema
from app.scoring import compute_stage_1
from app.service import process_matching_request


def mission_scores(profile, requirements):
    return compute_stage_1(MatchingRequestSchema(
        type_matching="missions", contexte="Profil fictif", service="Web",
        technologies=profile,
        candidats=[CandidatSchema(id=i, service="Web", technologies=techs,
                                  texte_libre="Mission fictive")
                   for i, techs in enumerate(requirements, start=1)],
    ))


def test_full_coverage_beats_larger_partial_overlap():
    profile = ["Next.JS", "TypeScript", "Django", "Docker", "PostgreSQL", "Redis", "Tailwind"]
    results = mission_scores(profile, [
        ["AWS", "Angular", "Django", "Docker", "PostgreSQL", "Redis", "Tailwind", "TypeScript"],
        ["Next.JS", "TypeScript"],
    ])
    assert [r.candidat_id for r in results] == [2, 1]
    assert results[0].score_technologies == 1
    assert results[0].score == 1
    assert results[1].score_technologies == .75
    assert results[1].score == .875


def test_extra_profile_skills_do_not_lower_score():
    before = mission_scores(["Python"], [["Python", "Django"]])[0]
    after = mission_scores(["Python", "React", "Docker"], [["Python", "Django"]])[0]
    assert before.score == after.score == .75


@pytest.mark.parametrize("profile,required,expected", [
    ([" Python ", "python", "Django"], ["PYTHON", "python"], 1),
    ([], ["Python"], 0),
    (["Python"], [], 1),
    ([], [], 1),
])
def test_missing_and_normalized_skills(profile, required, expected):
    assert mission_scores(profile, [required])[0].score_technologies == expected


def test_default_candidature_scoring_keeps_mission_as_target():
    result = compute_stage_1(MatchingRequestSchema(
        contexte="Mission fictive", technologies=["Python", "Django"], service="Web",
        candidats=[CandidatSchema(id=1, technologies=["Python", "React", "Docker"],
                                  service="Web", texte_libre="Profil fictif")],
    ))[0]
    assert result.score_technologies == .5
    assert result.score == .75


def test_technology_threshold_applies_before_top_selection():
    request = MatchingRequestSchema(
        type_matching="missions", contexte="Profil", service="Web",
        technologies=["Python"], min_technology_score=.5,
        candidats=[CandidatSchema(id=i, service="Web", technologies=techs, texte_libre="Mission")
                   for i, techs in enumerate([
                       ["Java"], ["Python", "Django", "Docker"], ["Python", "Django"], ["Python"]
                   ], start=1)],
    )
    assert [r.candidat_id for r in compute_stage_1(request)] == [4, 3]


def test_initial_scoring_returns_all_missions_without_llm():
    request = MatchingRequestSchema(
        type_matching="missions", scoring_only=True, contexte="Profil", service="Web",
        technologies=["Python"], top_n=6,
        candidats=[CandidatSchema(id=i, service="Web", technologies=["Python"] if i else ["Java"],
                                  texte_libre="Mission") for i in range(6)],
    )
    with patch("app.service.run_stage_2_llm", new_callable=AsyncMock) as llm:
        response = asyncio.run(process_matching_request(request))
    llm.assert_not_awaited()
    assert len(response.resultats) == 6
    assert response.resultats[-1].score_technologies == 0
    assert response.etage_2_reussi is False
