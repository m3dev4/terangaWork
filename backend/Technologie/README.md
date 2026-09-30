# Application `Technologie` — Le catalogue des technologies

## À quoi sert cette application ?

Un freelance sur Teranga Work indique les **technologies** qu'il maîtrise :
React, Python, Figma, Django, Photoshop… Cette application gère ce
catalogue global, avec pour chaque technologie un **logo** stocké sur
Cloudinary (service d'hébergement d'images en ligne).

> **Analogie pour non-développeur** : c'est la « liste des langages et
> outils » que les freelances cochent sur leur profil, comme les cases
> « compétences » d'un CV en ligne. L'application fournit la liste officielle
> et l'image (logo) qui va avec.

## Qui peut faire quoi ?

| Action | Utilisateur connecté | Administrateur |
|---|---|---|
| Consulter la liste des technologies | ✅ | ✅ |
| Consulter une technologie précise | ✅ | ✅ |
| Créer une technologie (avec logo) | ❌ | ✅ |
| Modifier / Supprimer | ❌ | ✅ |

## Les fichiers, un par un

### `models.py` — La définition d'une technologie

| Champ | Signification |
|---|---|
| `name` | Nom de la technologie (ex. « React »). `unique=True` : pas de doublons. |
| `imgUrl` | URL du logo hébergé sur Cloudinary. Obligatoire : une technologie sans logo ne peut pas exister. |
| `created_at` / `updated_at` | Horodatages automatiques. |

`ordering = ["name"]` garantit une liste triée alphabétiquement.

### `serializers.py` — Le traducteur JSON

`TechnologieSerializer` expose `id`, `name`, `imgUrl`, `created_at`,
`updated_at`. Points notables :

- `imgUrl` est **en lecture seule** : l'URL n'est jamais choisie par le
  client, elle est **calculée par le serveur** après l'upload du logo.
- `validate_name` refuse un nom vide et supprime les espaces inutiles
  (`strip()`), pour garder un catalogue propre.

### `views.py` — La logique d'accès et l'upload du logo

`TechnologieViewSet` suit le même principe que `Service` : lecture pour tout
utilisateur connecté, écriture réservée à l'admin (`get_permissions`).

La particularité est la méthode `create`, qui gère l'**upload d'image** :

1. Le frontend envoie un formulaire `multipart/form-data` contenant le
   fichier image dans le champ `image`, et le nom dans le champ `name`.
2. Si aucun fichier n'est fourni → erreur 400 avec un message clair.
3. `validate_image_file` (venant de `User.utils`) vérifie que le fichier est
   bien un JPEG / PNG / WebP et qu'il ne dépasse pas 5 Mo.
4. `upload_image` envoie le fichier vers Cloudinary dans le dossier
   `jefly/technologies` et renvoie l'URL sécurisée.
5. La technologie est enregistrée **avec l'URL Cloudinary uniquement** :
   l'image elle-même ne vit pas sur nos serveurs.

Deux types d'erreurs sont distingués :

- `InvalidImageError` (fichier trop gros, mauvais format) → **400**, c'est la
  faute du client ;
- `CloudinaryError` (panne du service d'hébergement) → **502**, la faute
  vient d'un service externe.

### `urls.py` — L'adresse des endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/technologies/` | GET | Liste des technologies |
| `/api/technologies/` | POST | Création avec logo (multipart) — admin |
| `/api/technologies/{id}/` | GET | Détail |
| `/api/technologies/{id}/` | PATCH / DELETE | Modification / suppression — admin |

## Liens avec les autres applications

- `freelance` : le profil `Freelancee` est relié à plusieurs technologies
  (relation « plusieurs-à-plusieurs ») — c'est la liste des compétences
  cochées par le freelance.
- `User` (onboarding) : l'étape « technologies » du parcours d'inscription
  propose ce catalogue.
- `User.utils` : fournit les fonctions partagées de validation et d'upload
  d'images Cloudinary.

## Points d'attention

- La modification (`update`) n'accepte pas de nouveau logo : le champ
  `imgUrl` est en lecture seule dans le serializer. Changer un logo impose
  aujourd'hui de supprimer puis recréer la technologie.
- Comme pour `Service`, la suppression d'une technologie utilisée par des
  profils supprime la liaison (mais pas le profil lui-même, grâce à la
  relation « plusieurs-à-plusieurs »).
