"""Reproductions locales de l'audit, sans appel reseau ni donnees reelles.

Depuis ia : .venv/Scripts/python.exe ../docs/verification_audit_ia.py
Ces assertions documentent les anomalies presentes, pas le comportement souhaite.
"""
import asyncio
import contextlib
import io
import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ia"))
from app.chat_orchestrator import (
    _construire_contexte_donnees,
    _detecter_ambiguite_mission,
    INTENT_RECOMMANDATIONS_MISSION,
)
from app.llm_client import run_stage_2_llm
from app.schemas import CandidatSchema, MatchingRequestSchema
from app.scoring import calculate_technologies_score, compute_stage_1


def candidate(cid, experience):
    return CandidatSchema(id=cid, technologies=["Python"], service="Backend",
                          annees_experience=experience, texte_libre="Profil fictif")


async def main():
    request = MatchingRequestSchema(contexte="Mission fictive", technologies=["Python"],
                                    service="Backend", candidats=[candidate(1, 0), candidate(2, None)])
    results = compute_stage_1(request)
    assert [(r.candidat_id, r.score) for r in results] == [(2, 1.0), (1, 0.9)]
    print("CONFIRME : experience absente=1.0 ; zero declare=0.9")

    assert calculate_technologies_score(["Python"], []) == 0.0
    assert calculate_technologies_score([], []) == 1.0
    print("CONFIRME : cible sans technologie favorise candidat sans technologie")

    assert calculate_technologies_score(["Python", "Rust"], ["Python"]) == 1.0
    assert calculate_technologies_score(["Python"], ["Python", "Rust"]) == 0.5
    print("CONFIRME : ratio asymetrique selon le sens mission/profil")

    request.top_n = -1
    assert len(compute_stage_1(request)) == 1
    print("CONFIRME : top_n negatif accepte et utilise comme slice Python")

    _, pertinent = _construire_contexte_donnees("annonceur", {
        "missions_annonceur": [{"id": 12, "title": "Projet Python"}],
        "recommandations_mission": {"resultats": [{"candidat_id": 1}]},
        "candidatures_mission": [{"id": 1}],
    }, "meilleurs candidats Projet Python", INTENT_RECOMMANDATIONS_MISSION)
    assert set(pertinent) == {"missions"}
    print("CONFIRME : candidatures/recommandations exclues du contexte annonceur")

    amb = _detecter_ambiguite_mission("meilleurs candidats mission #12", [
        {"id": 12, "title": "Projet Python"}])
    assert amb.missions_trouvees == []
    print("CONFIRME : identification par ID seul non resolue par le detecteur")

    request.top_n = 8
    fake_content = {"classement": [
        {"candidat_id": 1, "justification": "Fictif"},
        {"candidat_id": 1, "justification": "Doublon fictif"},
        {"candidat_id": 2, "justification": "Fictif"},
    ]}
    fake_response = SimpleNamespace(status_code=200, json=lambda: {
        "choices": [{"message": {"content": json.dumps(fake_content)}}]})
    with patch("app.llm_client.settings.OPENROUTER_API_KEY", "audit-fake"), \
         patch("httpx.AsyncClient.post", new=AsyncMock(return_value=fake_response)), \
         contextlib.redirect_stdout(io.StringIO()):
        output, success = await run_stage_2_llm("Fictif", request.candidats, results)
    assert success and [r.candidat_id for r in output] == [1, 1, 2]
    print("CONFIRME : reponse LLM avec IDs dupliques acceptee")


if __name__ == "__main__":
    asyncio.run(main())
