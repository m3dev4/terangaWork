from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.llm_client import build_llm_prompt
from app.main import app
from app.schemas import CandidatSchema, MatchingRequestSchema
from app.scoring import calculate_service_score, compute_stage_1
from app.service import process_matching_request

client = TestClient(app)


@pytest.mark.parametrize("type_matching", ["missions", "candidatures", "proactif"])
@pytest.mark.parametrize("services", [
    ["Développement Web", "Développement Frontend"],
    ["Développement Frontend", "Développement Web"],
    ["Développement Web", " DÉVELOPPEMENT FRONTEND ", "Design"],
])
def test_matching_uses_every_freelance_service_regardless_of_order(type_matching, services):
    freelance = {"services": services, "service": "Développement Web"}
    mission = {"service": "Développement Frontend"}
    target, candidate = (freelance, mission) if type_matching == "missions" else (mission, freelance)
    request = MatchingRequestSchema(
        type_matching=type_matching,
        technologies=["React"],
        **target,
        candidats=[CandidatSchema(id=1, technologies=["React"], **candidate)],
    )

    result = compute_stage_1(request)[0]
    assert result.score_service == 1.0
    assert result.score == 1.0


@pytest.mark.parametrize("type_matching", ["missions", "candidatures", "proactif"])
@pytest.mark.parametrize("services,mission_service,expected", [
    (["Développement Web", "Design"], "Développement Frontend", 0.0),
    ([], "Développement Frontend", 0.0),
    (["Développement Web"], "", 1.0),
    ([], "", 1.0),
])
def test_service_requirements_always_belong_to_the_mission(type_matching, services, mission_service, expected):
    freelance = {"services": services}
    mission = {"service": mission_service}
    target, candidate = (freelance, mission) if type_matching == "missions" else (mission, freelance)
    result = compute_stage_1(MatchingRequestSchema(
        type_matching=type_matching,
        **target,
        candidats=[CandidatSchema(id=1, **candidate)],
    ))[0]
    assert result.score_service == expected


def test_secondary_service_affects_ranking_before_top_n_selection():
    result = compute_stage_1(MatchingRequestSchema(
        service="Développement Frontend",
        technologies=["React"],
        top_n=1,
        candidats=[
            CandidatSchema(id=1, technologies=["React"], services=["Développement Web"]),
            CandidatSchema(id=2, technologies=["React"], services=["Développement Web", "Développement Frontend"]),
        ],
    ))[0]
    assert result.candidat_id == 2
    assert result.score == 1.0


@pytest.mark.parametrize("candidate,target,expected", [
    ([" ", "Frontend", "frontend"], " FRONTEND ", 1.0),
    ([" "], "Frontend", 0.0),
    (["Frontend"], " ", 1.0),
    (None, None, 1.0),
])
def test_service_normalization(candidate, target, expected):
    assert calculate_service_score(candidate, target) == expected


@pytest.mark.parametrize("type_matching", ["missions", "candidatures", "proactif"])
def test_matching_api_accepts_multiple_services(type_matching):
    freelance = {"services": ["Développement Web", "Développement Frontend"]}
    mission = {"service": "Développement Frontend"}
    target, candidate = (freelance, mission) if type_matching == "missions" else (mission, freelance)
    response = client.post(
        "/matching/score",
        headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY},
        json={
            "type_matching": type_matching,
            "scoring_only": True,
            "technologies": ["React"],
            **target,
            "candidats": [{"id": 1, "technologies": ["React"], **candidate}],
        },
    )
    assert response.status_code == 200
    assert response.json()["resultats"][0]["score_service"] == 1.0
    assert response.json()["resultats"][0]["score"] == 1.0


@pytest.mark.parametrize("type_matching", ["candidatures", "proactif"])
def test_freelance_prompt_includes_all_services(type_matching):
    candidate = CandidatSchema(
        id=1,
        services=["Développement Web", "Développement Frontend"],
        service="Développement Web",
    )
    prompt = build_llm_prompt("Mission frontend", [candidate], type_matching=type_matching)
    assert "Services: Développement Web, Développement Frontend" in prompt


@pytest.mark.asyncio
async def test_mission_prompt_includes_all_freelance_services():
    request = MatchingRequestSchema(
        type_matching="missions",
        services=["Développement Web", "Développement Frontend"],
        service="Développement Web",
        candidats=[CandidatSchema(id=1, service="Développement Frontend")],
    )
    with patch("app.service.run_stage_2_llm", new_callable=AsyncMock, return_value=([], True)) as llm:
        await process_matching_request(request)
    assert "Services du freelance : Développement Web, Développement Frontend" in llm.call_args.kwargs["contexte"]
