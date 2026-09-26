# Walkthrough — Intégration Backend Django & Microservice FastAPI "Matching Intelligent"

L'intégration complète entre le monolithe backend Django et le microservice FastAPI stateless a été réalisée avec succès dans la nouvelle application Django `matching/`.

---

## Modifications réalisées

### 1. Modèles & Migrations Django (`backend/matching/`)

- **[NEW] `backend/matching/models.py`** :
  - `ResultatMatching` : Table de persistance stockant les résultats de chaque calcul de matching (`mission`, `freelance`, `proposition`, `score`, `score_technologies`, `score_service`, `score_experience`, `justification_ia`, `date_calcul`).
- **[NEW] `backend/matching/migrations/0001_initial.py`** :
  - Migration initiale appliquée avec succès en base de données.

---

### 2. Services d'Orchestration & Communication (`backend/matching/services.py`)

- `get_freelance_experience_years` : Calcul automatique de la durée totale d'expérience en années à partir des enregistrements `Experience` du profil freelance (`None` si aucun enregistrement présent).
- `call_fastapi_matching` : Client synchrone `httpx.Client` avec header `X-Internal-API-Key` (variable d'environnement `FASTAPI_INTERNAL_API_KEY`) et timeout de 15 secondes vers `FASTAPI_MATCHING_URL`.
- En cas d'échec de communication (Timeout, Erreur réseau, HTTP 500), lève `MatchingServiceUnavailableError`.
- `process_candidats_recommandes` & `process_missions_recommandees` :
  - Construction automatique du payload `MatchingRequestSchema`.
  - Persistance dans `ResultatMatching`.
  - Enrichissement des résultats renvoyés au frontend (noms des freelances/annonceurs, titres, budgets, deadlines) avec le flag `etage_2_reussi`.

---

### 3. Vues API & Permissions (`backend/matching/views.py` & `backend/matching/permissions.py`)

- **`POST /api/matching/candidats-recommandes/<mission_id>/`** (`CandidatsRecommandesView`) :
  - Déclenché depuis "Consulter les propositions".
  - Authentification requise (`IsAuthenticated`).
  - Validation onboarding (`IsOnboardingComplete`).
  - Validation du rôle (`IsAnnonceur`).
  - **Vérification d'ownership stricte** : Vérifie que `mission.annonceur.user == request.user`, renvoie `403 FORBIDDEN` sinon.
  - En cas d'indisponibilité du microservice, renvoie une erreur HTTP 503 (`Matching temporairement indisponible`) sans bloquer la navigation.

- **`POST /api/matching/missions-recommandees/`** (`MissionsRecommandeesView`) :
  - Déclenché depuis "Rechercher une mission".
  - Authentification requise (`IsAuthenticated`).
  - Validation onboarding (`IsOnboardingComplete`).
  - Validation du rôle (`IsFreelance`).
  - En cas d'indisponibilité du microservice, renvoie une erreur HTTP 503 (`Matching temporairement indisponible`).

---

### 4. Configuration (`backend/config/`)

- **`backend/config/settings.py`** :
  - Ajout de `"matching"` à `INSTALLED_APPS`.
  - Ajout de `FASTAPI_MATCHING_URL` et `FASTAPI_INTERNAL_API_KEY`.
- **`backend/config/urls.py`** :
  - Inclusion des routes `/api/matching/`.
- **`backend/.env.example`** :
  - Documentation des nouvelles variables d'environnement.

---

## Résultats de la Vérification

Tous les tests d'intégration et de sécurité Django ont été exécutés avec succès via la commande :

```bash
.venv\Scripts\python.exe manage.py test matching
```

### Extrait du rapport de test :

```plain
System check identified 14 issues (0 silenced).
........
----------------------------------------------------------------------
Ran 8 tests in 44.722s

OK
Destroying test database for alias 'default'...
```

- **`test_unauthenticated_request_rejected`** : Rejet HTTP 401 si non connecté.
- **`test_incomplete_onboarding_rejected`** : Rejet HTTP 403 si l'onboarding est incomplet.
- **`test_announcer_non_owner_forbidden`** : Rejet HTTP 403 si l'annonceur n'est pas le propriétaire de la mission.
- **`test_freelance_cannot_access_announcer_endpoint`** : Rejet HTTP 403 en cas de rôle inadéquat.
- **`test_candidats_recommandes_success`** : Validation end-to-end de l'annonceur avec mock FastAPI, persistance en BD et réponse enrichie (`etage_2_reussi=True`).
- **`test_missions_recommandees_success`** : Validation end-to-end du freelance avec mock FastAPI, persistance en BD et réponse enrichie (`etage_2_reussi=False`).
- **`test_microservice_failure_returns_503`** : Validation du retour HTTP 503 (`Matching temporairement indisponible`) si le serveur FastAPI est injoignable.
