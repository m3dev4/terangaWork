# Application `announcer` — Les profils annonceurs

## À quoi sert cette application ?

Un **annonceur** est un utilisateur de Teranga Work qui publie des missions :
une entreprise qui cherche un prestataire, ou un particulier qui a un besoin
ponctuel. Cette application gère la **fiche d'identité professionnelle** de
l'annonceur : nom de l'entreprise, adresse, secteur d'activité, taille…

> **Analogie pour non-développeur** : c'est la « carte de visite » que
> l'annonceur remplit lors de son inscription. Les freelances peuvent ainsi
> savoir à qui ils ont affaire avant de candidater.

## Règle fondamentale : un seul profil par utilisateur

Chaque utilisateur annonceur possède **un et un seul** profil. Le système
interdit la création d'un doublon :

- tenter de créer un second profil → erreur 400 « Vous possédez déjà un
  profil annonceur. » ;
- le profil est lié au compte par une relation « un-à-un »
  (`OneToOneField`) : techniquement, un doublon est impossible.

## Qui peut faire quoi ?

| Action | Annonceur | Freelance |
|---|---|---|
| Lire son profil (`GET /api/announcer/me/`) | ✅ | ❌ (403) |
| Créer son profil (`POST /api/announcer/me/`) | ✅ (une fois) | ❌ (403) |
| Modifier son profil (`PATCH /api/announcer/me/`) | ✅ | ❌ (403) |

Aucun endpoint ne permet de consulter le profil d'un **autre** annonceur :
chacun ne voit que le sien.

## Les fichiers, un par un

### `models.py` — La définition du profil

| Champ | Signification |
|---|---|
| `user` | Lien unique vers le compte utilisateur (relation un-à-un). Si le compte est supprimé, le profil l'est aussi. |
| `typeAnnonceur` | Type d'annonceur : `Entreprise` ou `Particulier`. |
| `company_name` | Nom de l'entreprise. |
| `company_address` | Adresse de l'entreprise. |
| `company_phone` | Téléphone de contact. |
| `company_website` | Site web (doit être une URL valide). |
| `company_secteur` | Secteur d'activité (ex. « Agroalimentaire »). |
| `description` | Présentation libre (5000 caractères max). |
| `company_size` | Nombre de salariés. Optionnel. |
| `created_at` / `updated_at` | Horodatages automatiques. |

`TypeAnnouncer` est une liste de choix fermée : uniquement « Entreprise »
ou « Particulier ».

### `serializers.py` — Le traducteur JSON et les validations

`AnnouncerSerializer` expose tous les champs du profil sauf `user`
(rempli automatiquement par le serveur). Validations appliquées :

- **Champs obligatoires** : nom, adresse, secteur et description ne peuvent
  pas être vides (méthode `_required_text` qui supprime aussi les espaces
  parasites) ;
- **Téléphone** : caractères autorisés limités aux chiffres, `+`, `-`, `.`,
  espaces et parenthèses — un numéro contenant des lettres est refusé ;
- **Taille d'entreprise** : doit être un nombre positif si renseignée ;
- **Validation globale** (`validate`) : à la création, vérifie que
  l'utilisateur a bien le rôle annonceur et qu'il n'a pas déjà un profil ;
- **`create`** : attache le profil à l'utilisateur connecté — le client ne
  peut jamais choisir le propriétaire du profil.

### `views.py` — Une seule route, trois usages

`AnnouncerViewSet` est un `GenericViewSet` volontairement minimal : une
seule action personnalisée `me`, accessible aux méthodes GET, POST et PATCH.
C'est un choix d'architecture assumé (voir la note « ViewSet vs
ModelViewSet ») : le profil n'est pas une ressource « liste/détail »
classique, mais un singleton par utilisateur.

Le déroulement de `me` :

1. **Contrôle du rôle** : un freelance reçoit immédiatement un 403 ;
2. **GET** : renvoie le profil, ou 404 s'il n'existe pas encore ;
3. **POST** : création, refusée si un profil existe déjà (400) ;
4. **PATCH** : modification partielle, refusée si le profil n'existe pas
   (404).

### `urls.py` — L'adresse des endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/announcer/me/` | GET | Lire son profil annonceur |
| `/api/announcer/me/` | POST | Créer son profil (une seule fois) |
| `/api/announcer/me/` | PATCH | Modifier son profil |

### `admin.py` — L'interface d'administration

Le profil est enregistré dans l'admin Django : les administrateurs de la
plateforme peuvent consulter et corriger les profils depuis
`/admin/`.

## Liens avec les autres applications

- `User` : le profil appartient à un compte ; le rôle `annonceur` est
  choisi lors de l'onboarding.
- `mission` : chaque mission publiée référence le profil annonceur.
- `User` (onboarding) : les étapes `type_annonceur` et `infos_entreprise`
  remplissent ce profil automatiquement à l'inscription.

## Points d'attention

- Un annonceur de type « Particulier » doit malgré tout renseigner les
  champs entreprise (nom, adresse…) car ils sont obligatoires dans le
  serializer. L'onboarding saute l'étape `infos_entreprise` pour les
  particuliers, mais l'API `me` exige ces champs : incohérence à surveiller.
- Il n'existe pas encore de vue publique du profil annonceur pour les
  freelances (utile plus tard pour la confiance / réputation).
