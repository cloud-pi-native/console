# Helm charts internal

Ces charts Helm ont pour vocation le pilotage automatique des applications ArgoCD. Ils sont appelés en série par une Application racine (voir `root-application-example.yaml`) tout en évitant à la console de connaitre la CRD de chacun de ces objets.

Les fichiers values.yaml sont renommés `example-values.yaml` afin qu'un défaut de paramétrage du fichier values cible n'entraine pas le déploiement d'une application erronnée.

Pour valider le fonctionnement de votre chart :
```sh
helm template --dry-run ./dso-env -f dso-env/example-values.yaml
```

/!\ Les fichiers values de différents charts ont parfois une structure commune afin qu'un seul fichier values fournit par la console puisse être consommé par des charts différents (ex : commonLabels).

## dso-env

## dso-ns-resources


