# Plugin ArgoCD

Ce document décrit le fonctionnement du plugin ArgoCD.

# Hooks et Steps supportés

Le seul step supporté est pour l'instant le step `main`. Ceci est applicable à tous les hooks de ce plugin.

## upsertProject hook

Voici le diagramme de séquence du hook le plus important du plugin (`upsert`) :

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Kubernetes_DSO as Kubernetes
    participant Gitlab as Gitlab
    participant Keycloak as Keycloak
    participant Vault as Vault
    participant ArgoCD_DSO as ArgoCD
  end

  box External Cluster (when applicable)
    participant ArgoCD_EXT as ArgoCD
    participant Kubernetes_EXT as Kubernetes
  end

  Bob ->> Console: "Please upsert project"

  Console ->> Gitlab: Create "infrastructure" Zone/Environment/Project repository
  Console ->> Keycloak: Get RO & RW Groups
  Console ->> Vault: Retrieve Credentials
  Console ->> Gitlab: Create values.yaml files

  loop For every Zone/Environment
    alt cluster is INTERNAL
      Console ->> Kubernetes_DSO: Reconcile resources (Create/Update AppProject CRDs when needed)
      ArgoCD_DSO ->> Kubernetes_DSO: Detects new/updated AppProject CRDs
      ArgoCD_DSO ->> Kubernetes_DSO: Apply relevant changes
    else cluster is EXTERNAL
      ArgoCD_EXT ->> Gitlab: Detects new/updated values.yaml files
      ArgoCD_EXT ->> Kubernetes_EXT: Apply relevant changes
    end
  end

  Console ->> Gitlab: Remove infra values.yaml files for deleted env/zones
```

Il est à noter que ce diagramme décrit deux possibilités différentes qui se basent sur la propriété `cluster.external`.

Cette propriété va un peu plus loin que son nom l'indique a priori : il s'agit véritablement d'un mode de fonctionnement alternatif qui va être progressivement déployé sur les différents projets.

En effet, à l'origine, la console avait à sa charge l'intégralité de la création des ressources, dans un mode de fonctionnement qui est très proche de ce que fait ArgoCD en interne :

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Kubernetes_DSO as Kubernetes
    participant ArgoCD_DSO as ArgoCD
  end

  Bob ->> Console: "Please upsert project"

  loop For every Zone/Environment
    Console ->> Kubernetes_DSO: Reconcile resources (Create/Update AppProject CRDs when needed)
    ArgoCD_DSO ->> Kubernetes_DSO: Detects new/updated AppProject CRDs
    ArgoCD_DSO ->> Kubernetes_DSO: Apply relevant changes
  end
```

Mais, avec l'arrivée de clusters dit "externes" (c'est-à-dire qu'ils sont hors du périmètre de DSO, et gérés de manière autonome par les projets clients), est arrivée une contrainte : On ne peut plus interagir avec l'API Kubernetes (le cluster est "air gapped", soit injoignable de l'extérieur, *a fortiori* depuis la Console).

Il a donc fallu un nouveau paradigme, dans lequel c'est le cluster externe qui **vient récupérer les informations pour se mettre à jour**. Et la manière la plus efficace de faire ça, c'est de basculer en mode "GitOps", un mode dans lequel la Console créerait un fichier de configuration (typiquement un `values.yaml`) qui serait "tiré" par le cluster externe afin d'être traité par l'ArgoCD qui lui est rattaché.

Le flux devient donc le suivant :

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Gitlab as Gitlab
  end

  box External Cluster
    participant ArgoCD_EXT as ArgoCD
    participant Kubernetes_EXT as Kubernetes
  end

  Bob ->> Console: "Please upsert project"

  loop For every zone/environment
    Console ->> Gitlab: Reconcile (create/update/delete) values.yaml files
    ArgoCD_EXT ->> Gitlab: Detects new/updated values.yaml files
    ArgoCD_EXT ->> Kubernetes_EXT: Apply changes
  end
```

Cette migration de l'ancien mode de fonctionnement (En mode "Impératif" d'administration du cluster Kubernetes) au nouveau mode ("GitOps", ou "Déclaratif" pour le cluster externe) va se faire progressivement, mais en attendant les deux flux doivent être maintenus. Toute la branche de code concernant des clusters "internes" finira par disparaître.

## deleteProject hook

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Gitlab as Gitlab
    participant ArgoCD_DSO as ArgoCD
    participant Kubernetes_DSO as Kubernetes
  end

  box External Cluster (when relevant)
    participant ArgoCD_EXT as ArgoCD
    participant Kubernetes_EXT as Kubernetes
  end

  Bob ->> Console: "Please delete project"

  loop For every zone/environment
    Console ->> Gitlab: Delete values.yaml files
    alt cluster is INTERNAL
      Console ->> Kubernetes_DSO: Delete Application and AppProject CRDs
      ArgoCD_DSO ->> Kubernetes_DSO: Detects deleted AppProject CRDs
      ArgoCD_DSO ->> Kubernetes_DSO: Apply relevant changes (delete resources)
    else cluster is EXTERNAL
      ArgoCD_EXT ->> Gitlab: Detects deleted values.yaml files
      ArgoCD_EXT ->> Kubernetes_EXT: Apply relevant changes (delete resources)
    end
  end
```

## upsertCluster hook

Ce hook sert à la création/modification d'un cluster Kubernetes.
Il est à noter la distinction des clusters étiquetés `in-cluster` pour lesquels la gestion des secrets est différente (c'est une exception à la règle).

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Vault as Vault
    participant Kubernetes as Kubernetes
  end

  Bob ->> Console: "Please upsert cluster"

  alt cluster has "in-cluster" label
    Console ->> Kubernetes: Delete cluster Secret
  else cluster DOES NOT HAVE "in-cluster" label
    Console ->> Kubernetes: Create cluster Secret
  end

  Console ->> Vault: Create entry for cluster data
```

## deleteCluster hook

Ce hook sert à la "suppression" d'un cluster Kubernetes.
Il est à noter que le cluster n'est pas vraiment supprimé, mais "oublié" par la Console, qui n'en garde plus trace.

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Vault as Vault
    participant Kubernetes as Kubernetes
  end

  Bob ->> Console: "Please delete cluster"

  Console ->> Kubernetes: Delete cluster Secret
  Console ->> Vault: Destroy entry for cluster data
```

## upsertZone hook

Ce hook sert à la création/modification d'une Zone (qui contiendra donc un ou plusieurs clusters Kubernetes)

```mermaid
sequenceDiagram
  actor Bob as Bob

  box DSO
    participant Console as Console
    participant Gitlab as Gitlab
    participant Vault as Vault
    participant Kubernetes as Kubernetes
  end

  Bob ->> Console: "Please upsert zone"

  Console ->> Vault: Get credentials
  Console ->> Gitlab: Create infrastructure project for the zone if needed
  Console ->> Gitlab: Create argocd-values.yaml file
```

# Deployment as-code (declarative mode)

```mermaid
---
config:
  layout: default
  theme: base
  flowchart:
    curve: linear
    defaultRenderer: "elk"
---
flowchart TD
    subgraph "Helm-charts"
        H1@{ shape: doc, label: "Chart 'dso-argocd-zone'" }
        H2@{ shape: doc, label: "Chart 'dso-env'" }
        H3@{ shape: doc, label: "Chart 'dso-ns'" }
    end
    subgraph "Gitlab DSO"
        subgraph "zone repository"
            V1@{ shape: doc, label: "/argocd-values.yaml" }
            V2@{ shape: docs, label: "**/values.yaml" }
        end
        subgraph "project repositories"
            V3@{ shape: docs, label: "infra sources" }
        end
    end
    subgraph "DSO Cluster"
        A1[Application zone-#lt;name>-app]
        A1 --Deploy--> A3[ApplicationSet dso-appset]
        A1 --Deploy--> S1[Cluster secrets]
        V2 --Generator--> A3
        A3 --Generates--> A4[Application *-root]
        V2 --> A4
        H2 -.-> A4
        A4 --Deploys--> A7[Application #lt;project>-env]
        A4 --Deploys--> A8@{ shape: procs, label: "Application #lt;project>-#lt;env>-#lt;random-id>" }

    end
    S1 --> apps
    V1 --> A1
    H1 -.-> A1
    V3 ==> A8
    H3 -.-> A7
    V2 --> A7
    A7 --Deploys--> namespace & R1 & R2 & R3
    A8 ==Deploys==> A10
    A8 --Deploys--> A11
    subgraph apps["Apps Clusters"]
        subgraph namespace["Namespace"]
            A10@{ shape: procs, label: "K8S resources" }
            A11@{ shape: procs, label: "VaultStaticSecrets" }
            R1[ResourceQuota]
            R2[VaultConnection]
            R3[VaultStaticSecret registry-pull-secret]
            R3 --> R4[Secret registry-pull-secret]
            A11 --> R5@{ shape: procs, label: "Secrets" }
        end
    end
    subgraph "Vault DSO"
        kv1["KV Infra"]
        kv2@{ shape: procs, label: "KV Projets" }
    end
    kv1 --> R3
    kv2 --> A11
```
