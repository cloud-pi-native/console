# Migration vers la v9
## Qu'est-ce qui change ?
Nous avons pris la décision d'abandonner la fonctionnalité d'organisation, dès lors le projet ne sera plus rattaché à rien. Cela entraîne quelques problèmes de suivi des ressources, mais si vous suivez les instructions ci-dessous, tout ira bien.

Les organisations reviendront à l'avenir, mais sous une forme complètement différente.

## IMPORTANT
Sauvegardez votre instance gitlab et le kv Vault !!!

## Préparation des ressources
Depuis la version 8.22.0, le serveur api stocke son numéro de version pour chaque projet provisionné avec succès.

Avant de passer à la version 9, vous DEVEZ provisionner tous les projets actifs au moins à la version 8.23.0. Si vous ne le faites pas, le script de migration SQL lèvera une exception.

Un bon suivi des ressources est essentiel. Si un projet ne peut pas être provisionné avec succès, vous pouvez toujours changer sa valeur dans la base de données directement, mais assurez-vous que les balises suivantes sont appliquées sur les ressources kubernetes correspondantes :
- dso/project.id : (namespace, applications, appprojects)
- dso/project.slug : (namespace, applications, appprojects)
- dso/environment.id : (namespace, applications, appprojects)
- dso/repository.id : (namespace, applications)

## Migration des ressources utilisateurs
Vous pouvez lancer cette image (une seule fois) avant ou après la mise à jour vers la v9.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: migrate-v9
spec:
  containers:
    - image: ghcr.io/cloud-pi-native/migration:v9
      name: migrate-v9
      resources: {}
      envFrom:
        - secretRef:
            name: dso-config
  restartPolicy: Never
```
kubectl run --image docker ghcr.io/cloud-pi-native/migration:v9

### À propos de Gitlab
Parce que gitlab effectue de nombreuses tâches de manière asynchrone, nous ne pouvons pas supprimer les anciens groupes d'organisation après avoir transféré les groupes de projet. Vous devrez vous connecter manuellement pour les rechercher et les supprimer. Si vous ne le faites pas, ce n'est pas grave...
