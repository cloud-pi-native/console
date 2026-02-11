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
    participant Gitlab as Gitlab
  end

  box Project Cluster
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

Les clusters sont dits "externes" car ils sont hors du périmètre de DSO, et gérés de manière autonome par les projets clients, ce qui est une contrainte majeur : on ne peut pas interagir avec l'API Kubernetes (le cluster est considéré comme "air gapped", c'est-à-dire injoignable de l'extérieur, *a fortiori* depuis la Console). C'est en particulier le cas pour les clusters qui se trouvent dans une Zone DR ("Diffusion Restreinte").

C'est pourquoi la Console fonctionne avec son paradigme dans lequel c'est le cluster externe qui **vient récupérer les informations pour se mettre à jour**. Et la manière la plus efficace de faire ça, c'est de fonctionner en mode "GitOps", un mode dans lequel la Console crée un fichier de configuration (typiquement un `values.yaml`) qui serait récupéré (d'où le nom de "pull", en opposition au "push" traditionnel dans lequel on va utiliser les API Kubernetes) par le cluster externe afin d'être traité par l'ArgoCD qui lui est rattaché.

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

  box Project Cluster
    participant ArgoCD_EXT as ArgoCD
    participant Kubernetes_EXT as Kubernetes
  end

  Bob ->> Console: "Please delete project"

  loop For every zone/environment
    Console ->> Gitlab: Delete values.yaml files
    ArgoCD_EXT ->> Gitlab: Detects deleted values.yaml files
    ArgoCD_EXT ->> Kubernetes_EXT: Apply relevant changes (delete resources)
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
