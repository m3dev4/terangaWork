# Contribuer

> TerangaWork est un logiciel propriétaire. Ce guide s'adresse aux personnes autorisées à travailler sur le dépôt.

## Branches

| Branche | Rôle |
|---|---|
| `master` | Production : uniquement des versions taguées |
| `develop` | Intégration : base de toutes les branches de travail |
| `feat/<sujet>` | Nouvelle fonctionnalité (ex. `feat/suivi`) |
| `fix/<sujet>` | Correction |
| `audit`, `refont`… | Travaux transverses |

Le flux : `feat/x` → pull request vers `develop` → recette → merge de `develop` dans `master` → tag.

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/fr/), en français ou en anglais :

```
feat(suivi): ajouter la validation des livrables
fix(proposition): empêcher un freelance d'accepter sa propre candidature
docs: documenter l'architecture
refactor(ia): extraire le client Groq
test(suivi): couvrir la détection des retards
chore(deps): mettre à jour Django
```

## Avant d'ouvrir une pull request

```bash
# Backend
cd backend && python manage.py makemigrations --check && python manage.py test

# Microservice IA
cd ia && pytest -q

# Frontend
cd frontend && pnpm typecheck && pnpm lint
```

**Règles du projet**
- Une règle métier va dans un `services.py`, pas dans une vue.
- Toute notification passe par `notification.services.notifier()`.
- Toute action importante dans une mission est tracée dans `suivi.Historique`.
- Aucun automatisme ne décide à la place d'un humain (règle BNF7).
- Le module paiement ne se modifie qu'avec des tests dédiés.

## Tags et releases

Le versionnement suit [SemVer](https://semver.org/lang/fr/) :
- **MAJEUR** : changement incompatible (API, modèle de données) ;
- **MINEUR** : nouvelle fonctionnalité ;
- **CORRECTIF** : correction.

### Publier une version

1. Mettre à jour `CHANGELOG.md`, puis les numéros de version dans `frontend/package.json` (`version`) et `ia/app/main.py` (`version=` de FastAPI).
2. Merger `develop` dans `master`.
3. Créer et pousser le tag annoté :

   ```bash
   git checkout master && git pull
   git tag -a v1.0.0 -m "TerangaWork v1.0.0 — version de soutenance"
   git push origin v1.0.0
   ```

4. Créer la release GitHub à partir du tag, avec les notes du changelog :

   ```bash
   gh release create v1.0.0 --title "TerangaWork v1.0.0" --notes-file docs/releases/v1.0.0.md
   ```

   Sans la CLI `gh` : sur GitHub, ouvrir **Releases**, puis **Draft a new release**, choisir le tag et coller la section du changelog.

### Retagger l'historique (facultatif)

Les jalons passés sont décrits dans `CHANGELOG.md`. Pour leur donner un tag, placez-le sur le dernier commit de la période :

```bash
git tag -a v0.1.0 <commit> -m "v0.1.0"
git push origin --tags
```
