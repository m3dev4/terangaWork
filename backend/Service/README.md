# Application `Service` — Les catégories de prestations

## À quoi sert cette application ?

Sur Teranga Work, un **service** est une grande famille de prestation proposée sur la
plateforme : par exemple « Développement web », « Design graphique »,
« Rédaction », « Marketing digital »…

Cette application gère ce **catalogue de catégories**. C'est une brique de
référence : les missions publiées par les annonceurs et les profils des
freelances pointent chacun vers un service.

> **Analogie pour non-développeur** : le service est comme les « rayons »
> d'un supermarché. Chaque produit (mission ou profil freelance) est rangé
> dans un rayon précis. L'application `Service` gère uniquement la liste des
> rayons, pas les produits.

## Qui peut faire quoi ?

| Action | Utilisateur connecté (freelance ou annonceur) | Administrateur |
|---|---|---|
| Consulter la liste des services | ✅ | ✅ |
| Consulter un service précis | ✅ | ✅ |
| Créer un service | ❌ | ✅ |
| Modifier un service | ❌ | ✅ |
| Supprimer un service | ❌ | ✅ |

Le catalogue est **verrouillé** : seuls les administrateurs peuvent le faire
évoluer, afin que toutes les missions et tous les profils utilisent un
vocabulaire commun et cohérent.

## Les fichiers, un par un

### `models.py` — La définition d'un service

```python
class Service(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

| Champ | Signification |
|---|---|
| `name` | Nom du service (ex. « Développement web »). `unique=True` interdit les doublons : impossible d'avoir deux fois le même rayon. |
| `description` | Courte explication du service. Optionnel (`blank=True`). |
| `created_at` | Date de création, remplie automatiquement à l'enregistrement. |
| `updated_at` | Date de dernière modification, mise à jour automatiquement. |

- `class Meta: ordering = ["name"]` → la liste est toujours renvoyée par
  ordre alphabétique, pratique pour les menus déroulants du frontend.
- `__str__` → affiche le nom du service dans l'interface d'administration
  Django au lieu d'un identifiant technique.

### `serialiser.py` — Le traducteur JSON

`ServiceSerialiser` transforme un objet `Service` (données en base) en JSON
(compréhensible par le frontend React) et inversement. Il expose exactement
les champs `id`, `name`, `description`, `created_at`, `updated_at`.

> **Pour non-développeur** : la base de données parle « technique », le
> navigateur parle « JSON ». Le serializer est l'interprète entre les deux.

### `view.py` — La logique d'accès

`ServiceViewSet` est un `ModelViewSet` : Django REST Framework génère
automatiquement les 5 opérations standard (liste, détail, création,
modification, suppression) à partir d'un seul fichier.

La méthode `get_permissions` applique la règle du tableau ci-dessus :

```python
def get_permissions(self):
    if self.action in ["create", "update", "partial_update", "destroy"]:
        return [IsAdminUser()]   # écriture réservée à l'admin
    return [IsAuthenticated()]   # lecture pour tout utilisateur connecté
```

### `urls.py` — L'adresse des endpoints

Le routeur enregistre le ViewSet sous le préfixe `services`, ce qui donne :

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/services/` | GET | Liste des services (ordre alphabétique) |
| `/api/services/` | POST | Création — admin uniquement |
| `/api/services/{id}/` | GET | Détail d'un service |
| `/api/services/{id}/` | PATCH | Modification — admin uniquement |
| `/api/services/{id}/` | DELETE | Suppression — admin uniquement |

### `views.py` — Fichier vide

Ce fichier ne contient que le squelette généré par Django. La vraie logique
vit dans `view.py` (sans « s »). Il est conservé pour ne pas casser les
imports existants.

## Liens avec les autres applications

- `mission` : chaque mission publiée référence **un** service obligatoire.
- `freelance` : chaque profil freelance choisit **un** service principal.
- `User` (onboarding) : l'étape « service » du parcours d'inscription
  freelance propose ce catalogue à l'utilisateur.

## Points d'attention

- La suppression d'un service utilisé par une mission est autorisée en base
  (`on_delete=models.CASCADE` côté `Mission`), ce qui **supprimerait aussi les
  missions concernées**. À ce jour, aucune protection n'empêche ce scénario
  côté admin : à traiter avant la mise en production.
- Le nom du dossier et des fichiers mélange `view.py` / `views.py` et
  `serialiser.py` / `serializers.py` (orthographe anglaise et française).
  Fonctionnel, mais source de confusion pour les nouveaux développeurs.
