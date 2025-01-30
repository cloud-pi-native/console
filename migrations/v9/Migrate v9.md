# Migrating to v9
## What's changing?
We've taken the decision to abandon the organization feature, so the project won't be attached to anything. This is causing some resource tracking problems, but if you follow the instructions below, you'll be fine.

Organizations will return in future, but in a completely different form.

## Resource preparation
Since version 8.22.0, the api server stores its version number for each successfully provisioned project.

Before upgrading to version 9, you MUST provision all active projects to at least version 8.23.0. If you fail to do so, the SQL migration script will throw an exception.

Good resource tracking is essential. If a project cannot be provisioned successfully, you can always change its value in the database directly, but make sure the following tags are applied on the corresponding kubernetes resources:
- dso/project.id : (namespace, applications, appprojects)
- dso/project.slug : (namespace, applications, appprojects)
- dso/environment.id : (namespace, applications, appprojects)
- dso/repository.id : (namespace, applications)

## Migrate user resources
You can run this image (once only) before or after upgrading to v9

```yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: ghcr.io/cloud-pi-native/migration:v9
  name: migrate-v9
spec:
  containers:
    - image: docker
      name: ghcr.io/cloud-pi-native/migration:v9
      resources: {}
      envFrom:
        - secretRef:
            name: dso-config
  restartPolicy: Never
```
kubectl run --image docker ghcr.io/cloud-pi-native/migration:v9
