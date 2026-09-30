# Application `mission` — Les missions publiées par les annonceurs

## À quoi sert cette application ?

C'est le **cœur du marché** de Teranga Work. Un annonceur publie une **mission**
(un besoin à faire réaliser : « Créer une application mobile », « Refonte
d'un logo »…) avec un budget, une date limite et un mode de paiement. Les
freelances consultent ensuite ces missions pour y candidater.

> **Analogie pour non-développeur** : la mission est l'offre d'emploi
> affichée sur le tableau du marché. L'annonceur l'épingle avec le prix
> qu'il propose et la date limite de réponse. Les freelances se promènent
> devant le tableau et choisissent les offres qui les intéressent.

## Qui peut faire quoi ?

| Action | Annonceur (propriétaire) | Annonceur (autre) | Freelance | Admin |
|---|---|---|---|---|
| Voir la liste des missions | ✅ (les siennes) | ✅ (les siennes) | ✅ (toutes) | ✅ |
| Voir le détail d'une mission | ✅ | ✅ (les siennes) | ✅ | ✅ |
| Créer une mission | ✅ | ❌ | ❌ | ❌ |
| Modifier une mission | ✅ | ❌ (404) | ❌ (403) | ❌ |
| Supprimer une mission | ✅ | ❌ (404) | ❌ (403) | ❌ |

Deux protections distinctes s'appliquent :

- **Le rôle** : seuls les annonceurs peuvent écrire (`IsAnnonceur`). Un
  freelance qui tente une écriture reçoit `403 Forbidden`.
- **La propriété** : un annonceur ne voit et ne modifie que **ses propres**
  missions. Pour un autre annonceur, la mission n'existe tout simplement pas
  (`404 Not Found`) — on ne révèle même pas son existence.

## Les fichiers, un par un

### `models.py` — La définition d'une mission

| Champ | Signification |
|---|---|
| `title` | Titre de la mission (100 caractères max). |
| `description` | Le besoin détaillé (1000 caractères max). |
| `date_deadline` | Date limite de réalisation. Optionnelle (`null=True`). |
| `operateurMobileMoney` | Mode de paiement souhaité : `OM` (Orange Money) ou `WAVE`. |
| `budget` | Montant proposé, en FCFA (nombre entier). |
| `service` | Catégorie de la mission (lien vers `Service`). Si le service est supprimé, la mission l'est aussi (`CASCADE`). |
| `annonceur` | Qui publie la mission (lien vers `Announcer`). Si le profil annonceur est supprimé, la mission disparaît (`CASCADE`). |
| `created_at` / `updated_at` | Horodatages automatiques. |

`OperateurMobileMoneyType` est une liste de choix fermée : impossible
d'enregistrer un opérateur inconnu.

### `serializer.py` — Le traducteur JSON et les garde-fous

`MissionSerializer` expose tous les champs, mais rend `id`, `annonceur`,
`created_at` et `updated_at` **en lecture seule**. Point clé : le champ
`annonceur` n'est **jamais** envoyé par le client — le serveur le déduit de
l'utilisateur connecté. Impossible donc de publier une mission au nom de
quelqu'un d'autre.

Trois validations métier :

- `validate_title` : titre obligatoire, espaces superflus supprimés ;
- `validate_description` : description obligatoire ;
- `validate_budget` : le budget doit être **strictement positif** — une
  mission gratuite est interdite.

### `views.py` — La logique d'accès

Le fichier contient deux briques :

**1. `IsAnnonceur` (permission personnalisée)**

```python
class IsAnnonceur(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == UserRole.ANNONCEUR
```

Elle est appliquée uniquement aux actions d'écriture via `get_permissions` :
`create`, `update`, `partial_update` (PATCH) et `destroy` exigent le rôle
annonceur. La lecture (liste, détail) reste ouverte à tout utilisateur
authentifié — c'est ce qui permet aux freelances de consulter le marché.

**2. `MissionViewSet` et son `get_queryset`**

C'est ici que se joue la séparation des points de vue :

- **Freelance** → voit **toutes** les missions publiées (c'est le marché) ;
- **Annonceur** → ne voit que **ses** missions
  (`filter(annonceur__user=self.request.user)`) ;
- **Autre rôle** → liste vide.

`perform_create` attache automatiquement la mission au profil annonceur de
l'utilisateur connecté, après deux vérifications : le rôle doit être
annonceur, et le profil annonceur doit exister (sinon message explicite :
« Vous devez créer votre profil annonceur auparavant. »).

### `tests.py` — Les garanties vérifiées automatiquement

Quatre tests protègent les règles ci-dessus :

1. Un annonceur peut créer, modifier puis supprimer **sa** mission ;
2. Un annonceur ne voit **pas** les missions d'un autre annonceur, et sa
   tentative de modification reçoit un 404 ;
3. Un freelance ne peut **pas** créer de mission (403) ;
4. Un freelance **peut** lire la liste et le détail des missions, mais ses
   tentatives de modification et de suppression sont bloquées (403).

### `urls.py` — L'adresse des endpoints

Le routeur est enregistré dans `config/urls.py` sous `api/` :

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/missions/` | GET | Liste (selon le rôle, voir tableau) |
| `/api/missions/` | POST | Publication — annonceur uniquement |
| `/api/missions/{id}/` | GET | Détail d'une mission |
| `/api/missions/{id}/` | PATCH | Modification — propriétaire uniquement |
| `/api/missions/{id}/` | DELETE | Suppression — propriétaire uniquement |

## Liens avec les autres applications

- `announcer` : chaque mission appartient à un profil annonceur.
- `Service` : chaque mission est classée dans une catégorie.
- Frontend : la page `/espace/missions` (recherche freelance) et
  `/espace/mes-annonces` (gestion annonceur) consomment ces endpoints.

## Points d'attention

- Il n'existe pas encore de statut de mission (ouverte / en cours /
  terminée) : toutes les missions sont considérées comme actives.
- La candidature à une mission (côté freelance) n'est pas encore implémentée
  dans le backend : le bouton « Postuler » du frontend est pour l'instant
  décoratif.
- La recherche et le filtrage par service se font aujourd'hui côté frontend
  ; aucun paramètre de recherche n'est géré par l'API.
