"""Clé interne : refus si absente, publique ou erronée ; acceptée si correcte."""
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)
CLE = "cle-de-test-suffisamment-longue-0123456789"
CORPS = {"type_matching": "candidatures", "scoring_only": True, "technologies": [], "candidats": []}


@pytest.mark.parametrize("configuree,envoyee,attendu", [
    ("", "", 401),                                              # rien de configuré
    ("dev-secret-internal-key", "dev-secret-internal-key", 401),  # ancienne clé publique
    (CLE, "mauvaise-cle", 401),
    (CLE, None, 401),
    (CLE, CLE, 200),
])
def test_cle_interne(monkeypatch, configuree, envoyee, attendu):
    monkeypatch.setattr(settings, "INTERNAL_API_KEY", configuree)
    headers = {"X-Internal-API-Key": envoyee} if envoyee is not None else {}
    assert client.post("/matching/score", headers=headers, json=CORPS).status_code == attendu
