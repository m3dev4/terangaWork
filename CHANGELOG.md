# Changelog

Toutes les évolutions notables de TerangaWork sont consignées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et le projet respecte le [versionnement sémantique](https://semver.org/lang/fr/).

## [1.0.0] — 2026-10-10 · Version de soutenance

### Ajouté
- **Coworking par phases** (nouvelle app `suivi`) :
  - phase de cadrage de 3 à 5 jours, puis phase de développement ;
  - livrables validés ou invalidés, avec commentaire texte ou vocal ;
  - historique complet de la mission ;
  - demandes d'annulation décidées par l'admin ;
  - relances de l'admin.
- Commande `detecter_retards_suivi` : retards de cadrage, de livraison et de validation, notifiés sans décision automatique.
- **Assistant Malaw** : Groq prend le relais de Hugging Face en cas d'erreur, de délai dépassé ou de réponse vide.
- Avatar de l'assistant (`MalawAvatar`) dans tout le chat.
- Nouveau logo TerangaWork, avec ses versions pour fond clair et fond sombre.
- Support multi-service : un freelance peut proposer de 1 à 3 services.
- Licence propriétaire et commerciale ; documentation complète (`docs/`).

### Modifié
- **Rebranding** : Jëfly devient TerangaWork dans toute l'interface.
- Page d'accueil : un seul fond, pied de page clair.
- Une mission attribuée n'accepte plus de candidatures (frontend et API). Côté annonceur, les autres candidats sont grisés.

### Sécurité
- Seul l'annonceur peut accepter ou refuser une candidature ; une seule peut être acceptée.
- Le statut d'une mission est en lecture seule dans l'API ; une mission attribuée ne peut plus être modifiée ni supprimée.
- Une mission annulée ne peut plus redevenir active.
- La modération n8n est protégée par un secret (`X-N8N-Secret`) et limitée aux missions en attente.
- Les vocaux sont limités aux fichiers audio de 5 Mo maximum, avec un nom aléatoire.

### Corrigé
- L'acceptation d'une candidature plantait à cause d'une faute de frappe (`freelancee` au lieu de `freelance`).

## [0.6.0] — 2026-10-07

### Ajouté
- **Matching proactif** : notification automatique des freelances compatibles à 80 % ou plus quand une mission est approuvée.
- Mode sombre avec bascule de thème.
- Section confiance de la landing, corridor d'images animé (`ImageStreamHero`).
- Service frontend dans Docker Compose.

## [0.5.0] — 2026-10-01

### Ajouté
- **Assistant conversationnel** intégré (app `chatbot`, `/chat/ask` dans le microservice IA), répondant à partir des données autorisées de l'utilisateur.
- Nouvelle landing et sidebar mobile.
- Healthchecks Docker et script d'entrée du backend.

### Corrigé
- Paiement, scoring et responsive de plusieurs pages.

## [0.4.0] — 2026-09-26

### Ajouté
- **Parcours administrateur** : tableau de bord, référentiels, signalements.
- **n8n** : génération de la description des missions et workflow de modération.
- **Workflow de paiement** complet et statistiques des tableaux de bord.

## [0.3.0] — 2026-09-23

### Ajouté
- **Microservice FastAPI de matching** : scoring à deux étages, avec décision par LLM.
- **Paiement PayDunya** (Wave, Orange Money) et son interface.
- **Messagerie et notifications en temps réel** (WebSocket, Django Channels).
- Dockerisation du projet.

## [0.2.0] — 2026-09-19

### Ajouté
- Apps Service, Technologie, Freelance et Announcer, avec leurs modèles et API.
- Rôles utilisateur et onboarding par étapes.
- Gestion des missions par l'annonceur (technologies incluses).
- **Propositions** : candidature sur une mission.

## [0.1.0] — 2026-09-12

### Ajouté
- Initialisation du frontend : landing et composants réutilisables.
- Authentification : connexion, inscription, vérification d'email, récupération et réinitialisation du mot de passe.
- Base du projet Django et app `User`.

[1.0.0]: https://github.com/m3dev4/jefly/releases/tag/v1.0.0
[0.6.0]: https://github.com/m3dev4/jefly/releases/tag/v0.6.0
[0.5.0]: https://github.com/m3dev4/jefly/releases/tag/v0.5.0
[0.4.0]: https://github.com/m3dev4/jefly/releases/tag/v0.4.0
[0.3.0]: https://github.com/m3dev4/jefly/releases/tag/v0.3.0
[0.2.0]: https://github.com/m3dev4/jefly/releases/tag/v0.2.0
[0.1.0]: https://github.com/m3dev4/jefly/releases/tag/v0.1.0
