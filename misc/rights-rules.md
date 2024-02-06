# Droit

## Vocabulaire

- Console : interface utilisateur pour manipuler la plateforme
- Plateforme : Ensemble des outils connectés à la Console dont le but est d'apporter des services à l'utilisateur

## Console

### Roles de console

- Admin fonctionnel, personne ayant les droits pour consulter toutes les informations de base et manipuler des ressources ne lui appartenant pas, peut aussi utiliser l'application comme un *utilisateur*
- Utilisateur, attaché à une personne réélle, n'inclut pas de compte de service, peut utiliser l'application (créer, consulter, mettre à jour, supprimer) des ressources qu'il a créées ou sur lesquelles on lui a délégué des droits

### Ressources sur la console

- `Services` : Pilotés par la console, ils apportent des fonctionnalités aux utilisateurs, certains permettent un accès personnel, d'autres non. Ils sont 8 dans l'offre de base mais peuvent être ajoutés sous forme de plug-in.
- `Projet` : Représente une couche abstraite servant à regrouper ses sous-ressources et à gérer une équipe
  
  Un projet contient les sous-ressources suivantes :
  - `Equipe` : Ensemble d'utilisateurs de la console ayant des accès au projet
    - `Rôles` :
      - `owner` : Le créateur du projet,
      - `user` : Utilisateur ajouté par le `owner`

  - `Dépôt` : Aussi appelé dépôt de code, sert à importer du code extérieur dans la plateforme, son but est de construire des artéfacts (executables, librairies, images docker, ...)
    - Dépôt d'infrastructure : désigne la façon dont les artéfacts doivent être déployés dans les `environnements` (chart helm/manifests)

  - `Environnement` : Instanciation de tous les dépôts d'infrastructure sur un cluster (Kubernetes / Openshift).
    Un environnement contient des `permissions`, il est attaché à un `type d'environnement`, à un `quota` et à un `cluster`
    Ils sont representés par des namespaces sur les `clusters`
    - `Permissions` : Propres à chaque environnement, elles définissent de manière plus fine quels `utilisateurs` de l'`équipe` ont quels droits.

- `Types d'environnement` : Aussi appelé *Stage* en anglais, ils permettent de segmenter les environnements en groupe afin d'y conditionner l'accès aux `clusters` et `quotas`.

  Son état est soit `active` soit `pendingDelete` ce qui signifie qu'il n'est plus utilisable pour les nouveaux environnements, mais encore rattachés à certains

- `Cluster` : Ensemble de noeuds Kubernetes ou Openshift, ils sont administrés par les `admins fonctionnels`, et utilisables par les `utilisateurs`. Ils peuvent être soit `public` (accessible à tous les utilisateurs), soit `dedicated` (réservé à certains `projets`)

- `Quotas` : Limite de ressources utilisables par un `environnement` sur un `cluster`
  
  Un quota peut aussi être privé, dans ce cas il ne peut être attribué à un namespace que par un admin et ne peut être changé sur cet environnement que par un admin.

### Système de droits

#### Projets

- Admin : peut tous les voir.
- Utilisateur : peut voir seulement les siens et ceux dont il est membre de l'équipe.
  - le `owner` peut :
    - Ajouter / supprimer des utilisateurs à l'équipe
    - Créer / mettre à jour / supprimer des dépôts
    - Créer / mettre à jour / supprimer des environnements
  - un `user` ne peut que visualiser les sous-ressources du projet.

#### Environnment

- Admin : peut voir et modifier les quotas de tous les environnements de tous les projets
- Utilisateur :
  - le `owner` peut ajouter / changer / retirer des environnements à son projet et gérer les permissions des `users` de son équipe
  - un `user` ne peut que visualiser les détails des environnments sur lesquels il a explicitement des droits.

#### Dépôt

- Admin : peut lister les dépôts de tous les projets
- Utilisateur : peut voir seulement les siens et ceux dont il est membre de l'équipe.
  - le `owner` peut ajouter / changer / retirer des permissions aux `users` de son équipe
  - un `user` ne peut que visualiser les informations basiques des dépôts.

#### Type d'environnement

- Admin : création / suppression et rattachement aux différents `quotas` et `clusters`
- Utilisateur : peut tous les lister avec leurs états

#### Quota

- Admin : création / modification / suppression et rattachement aux différents `types d'environnement`
- Utilisateur : peut lister tous ceux qui sont publics et ceux qui sont rattachés à un `environnement` sur lequel il a des `permissions`

#### Cluster

- Admin :
  - création
  - modification
  - suppression
  - visualisation des infos **sensibles**
  - rattachement aux différents `types d'environnement`
- Utilisateur :
  - visualisation des infos **basiques**
  - uniquement de ceux `public` et des `dedicated` qui sont rattachés à un `environnement` sur lequel il a des `permissions`

## CRUD

### Create

| Ressource   | Admin | Utilisateur | Owner | Guest (user) |
| ----------- | ----- | ----------- | ----- | ------------ |
| Project     |       | X           | n/a   | n/a          |
| Environment |       | X           | X     |              |
| Repository  |       | X           | X     |              |
| Stage       | X     |             | n/a   | n/a          |
| Quota       | X     |             | n/a   | n/a          |
| Cluster     | X     |             | n/a   | n/a          |

### READ

#### Project

| Ressource   | Propriété   | Admin | Owner | Guest | RWD | RW  | R   |
| ----------- | ----------- | ----- | ----- | ----- | --- | --- | --- |
| Project     | name        | X     | X     | X     | n/a | n/a | n/a |
|             | Description | X     | X     | X     | n/a | n/a | n/a |
| Environment | name        | X     | X     | X     | X   | X   | X   |
|             | Quota       | X     | X     |       | X   | X   | X   |
|             | Stage       | X     | X     |       | X   | X   | X   |
|             | Cluster     | X     | X     |       | X   | X   | X   |
| Repository  | name        | X     | X     | X     | n/a | n/a | n/a |
|             | source      | X     | X     | X     | n/a | n/a | n/a |
|             | username    | x     | X     | X     | n/a | n/a | n/a |
|             | password    | n/a   | n/a   | n/a   | n/a | n/a | n/a |

| Ressource           | Propriété  | Admin | Utilisateur |
| ------------------- | ---------- | ----- | ----------- |
| Stage               | name       | X     | X           |
|                     | →quotas    | X     | X           |
| Quota (public)      | name       | X     | X           |
|                     | CPU        | X     | X           |
|                     | Memory     | X     | X           |
|                     | →stages    | X     | X           |
| Quota (private)     | name       | X     | x*          |
|                     | CPU        | X     | x*          |
|                     | Memory     | X     | x*          |
|                     | →stages    | X     | x*          |
| Cluster (public)    | name       | X     | X           |
|                     | Kubeconfig | X     |             |
|                     | Infos      | X     | X           |
|                     | Settings   | X     |             |
| Cluster (dedicated) | name       | X     | x*          |
|                     | Kubeconfig | X     |             |
|                     | Infos      | X     | x*          |
|                     | Settings   | X     |             |

x* Only if linked with env with perms on it

### Update

| Ressource   | Propriété   | Admin | Owner | Guest | RWD | RW  | R   |
| ----------- | ----------- | ----- | ----- | ----- | --- | --- | --- |
| Project     | name        |       |       |       | n/a | n/a | n/a |
|             | Description | X     | X     |       | n/a | n/a | n/a |
| Environment | name        |       |       |       | X   | X   |     |
|             | Quota       | X     | X     |       | X   |     |     |
|             | Stage       |       |       |       |     |     |     |
|             | Cluster     |       |       |       |     |     |     |
| Repository  | name        |       |       |       |     |     |     |
|             | source      |       | X     |       | n/a | n/a | n/a |
|             | username    |       | X     |       | n/a | n/a | n/a |
|             | password    |       | X     |       | n/a | n/a | n/a |

| Ressource | Propriété  | Admin | Utilisateur |
| --------- | ---------- | ----- | ----------- |
| Stage     | name       | X     |             |
|           | → quotas   | X     |             |
| Quota     | name       | X     |             |
|           | CPU        |       |             |
|           | Memory     |       |             |
|           | → stages   | X     |             |
| Cluster   | name       |       |             |
|           | Kubeconfig | X     |             |
|           | Settings   | X     |             |

### Delete

| Resource    | Admin | Owner | Guest | RWD | RW  | R   |
| ----------- | ----- | ----- | ----- | --- | --- | --- |
| Project     | X     | X     |       | n/a | n/a | n/a |
| Environment |       | X     |       | X   |     |     |
| Repository  |       | X     |       | n/a | n/a | n/a |

| Resource | Admin | Utilisateur |
| -------- | ----- | ----------- |
| Stage    | Y     |             |
| Quota    | Y     |             |
| Cluster  |       |             |
