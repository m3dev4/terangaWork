# Backend (Django)

API REST et temps réel de TerangaWork. C'est la **source de vérité** : base de données, droits et règles métier.

| Élément | Valeur |
|---|---|
| Framework | Django 5.2, Django REST Framework 3.18 |
| Temps réel | Django Channels 4.2, servi par Daphne (ASGI) |
| Authentification | JWT (`djangorestframework-simplejwt`) : accès 9 h, rafraîchissement 14 jours |
| Base de données | SQLite par défaut (`USE_SQLITE=True`), MySQL 8.4 en production |
| Documentation de l'API | Swagger sur `/api/docs/`, schéma OpenAPI sur `/api/schema/` (drf-spectacular) |
| Python | 3.12 (image Docker) |

## Organisation

```
backend/
├── config/         settings.py, urls.py, asgi.py (HTTP + WebSocket), routing.py
├── User/           Comptes, auth, sessions, onboarding, signalements, statistiques
├── freelance/      Profil freelance, expériences, formations, réalisations
├── announcer/      Profil annonceur (particulier ou entreprise)
├── Service/        Référentiel des services (géré par l'admin)
├── Technologie/    Référentiel des technologies (géré par l'admin)
├── mission/        Missions, aide à la rédaction et modération (n8n), livraison, paiement
├── proposition/    Candidatures et réunions (LiveKit)
├── matching/       Appels au microservice IA, matching proactif
├── paiement/       PayDunya : collecte, décaissement, webhooks
├── message/        Messagerie par mission (REST + WebSocket)
├── notification/   Notifications : notifier() est le point d'entrée unique
├── chatbot/        Conversations de l'assistant, données autorisées pour l'IA
└── suivi/          Coworking : phases, livrables, commentaires, historique, annulation
```

Plusieurs apps ont leur propre `README.md` (User, Service, Technologie, announcer, freelance, mission, config).

## Rôles et permissions

| Rôle | Comment il est identifié | Peut notamment |
|---|---|---|
| **Freelance** | `User.role = "freelance"` + profil `Freelancee` | Postuler, soumettre des livrables, marquer une mission livrée |
| **Annonceur** | `User.role = "annonceur"` + profil `Announcer` | Publier, accepter une candidature, valider ou invalider, payer, demander une annulation |
| **Admin** | `User.is_staff` ou `is_superuser` | Modérer, gérer les référentiels, traiter les signalements, décider des annulations, relancer |

Les droits sont toujours vérifiés côté serveur, objet par objet : annonceur propriétaire de la mission, freelance dont la candidature est acceptée, ou admin.

## Modèles

<details>
<summary><b>User</b> — comptes et sécurité</summary>

| Modèle | Champs principaux |
|---|---|
| `User` | email (identifiant), first_name, last_name, number_phone, profile_picture, role, is_verified, onboarding_completed, onboarding_step, googleId |
| `optCode` | user, code, code_expiration, is_used (codes de vérification) |
| `session` | user, token, device, location, is_active, date_last_used, token_expiration |
| `Signalement` | reporter, reported_user, mission, category, reason, status |
</details>

<details>
<summary><b>freelance / announcer</b> — profils</summary>

| Modèle | Champs principaux |
|---|---|
| `Freelancee` | user (1-1), title, description, githubUrl, linkedinUrl, services (M2M, 1 à 3), technologies (M2M) |
| `Experience` | freelance, entreprise, poste, startDate, endDate, current, description |
| `Education` | freelance, role, nom, etablissement, intitule, date_obtention, lien_verification, dates |
| `Realisation` | freelance, title, description, link |
| `Announcer` | user (1-1), typeAnnonceur (Entreprise ou Particulier), company_*, description |
</details>

<details>
<summary><b>Service / Technologie</b> — référentiels</summary>

| Modèle | Champs |
|---|---|
| `Service` | name, description |
| `Technologie` | name, imgUrl (Cloudinary) |
</details>

<details>
<summary><b>mission / proposition</b></summary>

| Modèle | Champs principaux |
|---|---|
| `Mission` | title, description, budget (10 000 FCFA minimum), date_deadline, operateurMobileMoney (`OM`, `WAVE`), service, technologies, annonceur, status |
| `Proposition` | mission, freelance, lettre_motivation, date_livraison, currentDate, proposition_status (unique par couple freelance et mission) |
| `ProjectMeeting` | mission, title, date, time, room_name, link, created_by |
</details>

<details>
<summary><b>matching / paiement</b></summary>

| Modèle | Champs principaux |
|---|---|
| `ResultatMatching` | mission, freelance, proposition, score, score_technologies, score_service, score_experience, justification_ia |
| `NumeroPaiement` | freelance, operateur, numero, date_confirmation (un numéro par freelance et par opérateur) |
| `Paiement` | proposition (1-1), montant_brut, taux_commission, montant_commission, montant_net, statut_collecte, statut_decaissement, références, dates |
</details>

<details>
<summary><b>message / notification / chatbot</b></summary>

| Modèle | Champs principaux |
|---|---|
| `Message` | id (UUID), expediteur, destinataire, mission, type (texte ou audio), contenu, audio_url |
| `MessageLu` | message, utilisateur, date_lecture |
| `Notification` | id (UUID), utilisateur, type, titre, message, lue, liens optionnels (mission, proposition, paiement, message) |
| `ChatConversation` | owner, title |
| `ChatMessage` | conversation, role, content |
</details>

<details>
<summary><b>suivi</b> — coworking</summary>

| Modèle | Champs principaux |
|---|---|
| `Phase` | mission, type (`CADRAGE`, `DEVELOPPEMENT`), statut (`EN_COURS`, `VALIDEE`), date_limite, retard_notifie |
| `Livrable` | phase, freelance, titre, lien, description, statut (`A_VALIDER`, `VALIDE`, `INVALIDE`), date_decision |
| `CommentaireLivrable` | livrable, auteur, type (`TEXTE`, `VOCAL`), texte, fichier_vocal |
| `Historique` | mission, auteur (vide si l'action vient du système), action, details, date_action |
| `DemandeAnnulation` | mission, annonceur, statut (`EN_ATTENTE`, `ACCEPTEE`, `REFUSEE`), decide_par, date_decision |
</details>

## Endpoints

Tous les chemins sont préfixés par `/api/`. Sauf mention contraire, ils exigent un JWT.

### Authentification et compte

| Méthode | Chemin | Description |
|---|---|---|
| POST | `auth/token/`, `auth/token/refresh/` | Obtenir et rafraîchir un JWT |
| POST | `auth/register/` | Inscription |
| POST | `auth/verify-email/` | Vérification de l'email par code |
| POST | `auth/login/` | Connexion (crée une session) |
| POST | `auth/select-role/` | Choix du rôle |
| POST | `auth/password-reset/`, `auth/new-password/`, `auth/change-password/` | Mot de passe |
| GET | `auth/get-all-sessions/` | Sessions actives |
| POST | `auth/revoke-session/`, `auth/revoke-all-other-sessions/` | Révoquer des sessions |
| GET | `me/` | Utilisateur courant |
| GET, PUT, PATCH, DELETE | `profile/<id>/` | Profil |
| POST, DELETE | `profile/photo/` | Photo de profil (Cloudinary) |
| GET | `onboarding/status/` | Étape courante |
| POST | `onboarding/<étape>/`, `onboarding/skip/<étape>/`, `onboarding/back/<étape>/` | Avancer, passer ou revenir |
| GET | `dashboard/stats/` | Statistiques de l'utilisateur |
| GET | `admin/dashboard/stats/` | Statistiques globales (admin) |
| CRUD | `signalements/` | Signalements |

### Profils et référentiels

| Méthode | Chemin | Description |
|---|---|---|
| GET, POST, PATCH | `freelance/me/` | Profil freelance |
| CRUD | `experiences/`, `educations/`, `realisations/` | Parcours du freelance |
| GET, POST, PATCH | `announcer/me/` | Profil annonceur |
| CRUD | `services/`, `technologies/` | Référentiels (écriture réservée à l'admin) |

### Missions et candidatures

| Méthode | Chemin | Description |
|---|---|---|
| GET, POST | `missions/` | Liste (filtrée selon le rôle) et création (annonceur) |
| GET, PUT, PATCH, DELETE | `missions/<id>/` | Détail. Modification et suppression impossibles une fois la mission attribuée |
| POST | `missions/generate-description/` | Aide à la rédaction (n8n) |
| POST, PATCH | `missions/<id>/moderation/` | `{decision: approuver ou supprimer}` (admin ou n8n avec `X-N8N-Secret`) |
| POST | `missions/<id>/marquer-livree/` | Freelance : `IN_PROGRESS` → `DELIVERED` |
| POST | `missions/<id>/valider-livraison/` | Annonceur : `DELIVERED` → `COMPLETED` |
| POST | `missions/<id>/payer/` | Annonceur : lance la collecte PayDunya |
| GET | `missions/<id>/historique-paiement/` | Statuts et montants du paiement |
| GET, POST | `propositions/` | Candidatures (création réservée au freelance, sur une mission `OPEN`) |
| GET, PATCH | `propositions/<id>/` | Accepter ou refuser : seul l'annonceur peut changer le statut |
| GET | `propositions/<id>/profil-freelance/` | Profil complet du candidat (annonceur) |
| POST | `propositions/<id>/confirmer-numero-paiement/` | Numéro mobile money du freelance retenu |
| CRUD | `meetings/` | Réunions de projet |
| GET | `meetings/<id>/token/` | Jeton LiveKit |

### Matching

| Méthode | Chemin | Description |
|---|---|---|
| GET | `matching/missions-compatibilite/` | Score de compatibilité des missions ouvertes (scoring seul) |
| POST | `matching/missions-recommandees/` | Missions recommandées au freelance (scoring + LLM) |
| POST | `matching/candidats-recommandes/<mission_id>/` | Meilleurs candidats d'une mission (scoring + LLM) |

### Paiement (webhooks PayDunya, publics)

| Méthode | Chemin |
|---|---|
| POST | `webhooks/paydunya/collecte/` (alias `payments/webhooks/paydunya/collecte/`) |
| POST | `webhooks/paydunya/decaissement/` (alias `payments/webhooks/paydunya/decaissement/`) |

### Messagerie et notifications

| Méthode | Chemin | Description |
|---|---|---|
| GET, POST | `messages/` | Messages |
| GET | `messages/conversation/<mission_id>/` | Fil d'une mission |
| POST | `messages/<id>/mark_read/`, `messages/mark_all_read/<mission_id>/` | Accusés de lecture |
| GET | `notifications/`, `notifications/stats/` | Liste et compteurs |
| PATCH | `notifications/<id>/mark_read/` | Marquer comme lue |
| POST | `notifications/mark_all_read/` | Tout marquer comme lu |
| DELETE | `notifications/delete_all_read/`, `notifications/<id>/` | Supprimer |
| WS | `ws/chat/` | Messages et notifications en temps réel |

### Assistant

| Méthode | Chemin | Description |
|---|---|---|
| GET, POST | `chat/conversations/` | Conversations de l'utilisateur |
| GET, DELETE | `chat/conversations/<id>/`, `chat/conversations/<id>/messages/` | Détail et historique |
| POST | `chat/conversations/<id>/send/` | Poser une question (appelle l'IA) |
| GET | `chat/data/freelance/propositions/`, `chat/data/freelance/missions-acceptees/`, `chat/data/freelance/profil/` | Données autorisées (appelées par l'IA, clé interne) |
| GET | `chat/data/annonceur/missions/`, `chat/data/annonceur/mission/<id>/candidatures/`, `chat/data/annonceur/mission/<id>/recommandations/` | Idem, côté annonceur |

### Coworking (suivi)

| Méthode | Chemin | Qui |
|---|---|---|
| GET | `suivi/missions/<id>/` | Participants et admin : phases, livrables, commentaires |
| POST | `suivi/missions/<id>/livrables/` | Freelance assigné |
| POST | `suivi/livrables/<id>/valider/` | Annonceur (commentaire facultatif, multipart pour le vocal) |
| POST | `suivi/livrables/<id>/invalider/` | Annonceur (commentaire obligatoire) |
| POST | `suivi/missions/<id>/repousser-deadline/` | Annonceur, pendant le cadrage |
| POST | `suivi/missions/<id>/relancer/` | Admin : `{destinataire: freelance ou annonceur}` |
| GET | `suivi/missions/<id>/historique/` | Participants et admin |
| POST | `suivi/missions/<id>/demander-annulation/` | Annonceur |
| GET | `suivi/demandes-annulation/` | Admin |
| POST | `suivi/demandes-annulation/<id>/decider/` | Admin : `{decision: accepter ou refuser}` |

## Notifications

`notification.services.notifier(utilisateur, type_notif, titre, message, mission=…, …)` est la **seule** fonction à utiliser pour créer une notification. Elle l'enregistre en base puis la pousse en WebSocket.

Types disponibles :
- **Candidatures et mission** : `PROPOSITION_ACCEPTEE`, `PROPOSITION_REJETEE`, `MISSION_DEMARREE`, `MISSION_LIVREE`, `MISSION_COMPLETEE`, `MISSION_ANNULEE`, `MISSION_LITIGE`, `MISSION_RECOMMANDEE` ;
- **Paiement et messagerie** : `PAIEMENT_REUSSI`, `PAIEMENT_ECHOUE`, `NOUVEAU_MESSAGE` ;
- **Coworking** : `CADRAGE_A_LIVRER`, `LIVRABLE_SOUMIS`, `LIVRABLE_VALIDE`, `LIVRABLE_INVALIDE`, `DEADLINE_REPOUSSEE`, `RETARD_CADRAGE`, `RETARD_LIVRAISON`, `RETARD_VALIDATION`, `RELANCE_SUIVI`, `DEMANDE_ANNULATION`, `ANNULATION_REFUSEE`.

## Commandes de gestion

| Commande | Rôle | Fréquence |
|---|---|---|
| `python manage.py migrate` | Applique les migrations (lancée automatiquement par `entrypoint.sh`) | À chaque déploiement |
| `python manage.py createsuperuser` | Crée un compte admin | Une fois |
| `python manage.py detecter_retards_suivi` | Notifie les retards de cadrage et de livraison, et les livrables sans réponse | **Une fois par jour** (cron ou n8n) |

## Tests

```bash
cd backend
python manage.py test                       # toute la suite
python manage.py test suivi proposition     # une ou plusieurs apps
```

Couverture actuelle :
- `suivi` : flux complet du coworking et régressions de sécurité ;
- `proposition`, `mission`, `notification`, `matching`, `chatbot`.

Les tests de `paiement` sont à mettre à jour : ils utilisent encore l'ancien champ `service=` de `Freelancee`.
