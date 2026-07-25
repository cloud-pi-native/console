# Plugin manager

## Présentation

Le plugin manager ou communément appelés "hooks" est une interface permettant au serveur d'api (`apps/server`) de déclencher des hooks "déclencheurs / événements" pour que les plugins puissent piloter et configurer des outils.

Les plugins obligatoires de l'application sont souvent appelés `corePlugins`.

L'objectif est que le server soit totalement agnostique des actions des plugins et même de leur existence. De plus le serveur d'API essayera au démarrage de charger des plugins dans un dossier spécifique, on les distingue en les appelant `externalPlugins`.

## Développement de plugin

Cette section est dédiée à tous ceux voulant améliorer les corePlugins ou en créer de nouveaux.

Pour commencer je vous conseille d'aller regarder le [plugin vault](../../plugins/vault)

### Interface

Tout paquet existant devrait avoir un export nommé `plugin` et de type `Plugin`.

Ce typage vous assurera de bien fournir toutes les clés nécessaires au bon fonctionnement du plugin :

```ts
// index.ts
import type { Plugin } from '@cpn-console/hooks'
import infos from './infos.js'
import monitor from './monitor.js'

export const plugin: Plugin = {
  infos,
  subscribedHooks: {},
  monitor,
}
```

### Infos

Ce sont les infos de bases de votre application :

```ts
// infos.ts
import type { ServiceInfos } from '@cpn-console/hooks'

const infos: ServiceInfos = {
  name: 'my_plugin', // il serait bien que ça ne change jamais, imaginez que c'est un identifiant unique.
  to: ({ projectSlug }) => `${process.env.MON_URL}/${projectSlug}`,
  title: 'Mon super plugin',
  imgSrc: 'https://un_lien_vers/image_externe.svg/', // préférez le svg
  description: 'La description générale de mon plugin',
}

export default infos
```

La fonction `to` peux renvoyer une `String` ou un objet contenant une clé `to` et potentiellement d'autres informations ou encore un tableau de cet objet :

```ts
// Valid
const to1 = () => 'une url'
const to2 = () => ({ to: 'url', title: 'Un titre', description: 'description', imgSrc: 'url' })
function to3() {
  return [
    { to: 'url générale', title: 'Service générale', description: 'description générale' },
    { to: 'url1', title: 'Service 1', description: 'description 1' },
    { to: 'url2', title: 'Service 2', description: 'description 2' },
  ]
}
// Invalid
const to3 = () => ['url', 'url1', 'url2']
```

### Monitoring

Pour offrir un (et un seul) service de monitoring sommaire de l'outil que le plugin manipule, vous pouvez créer une instance de la classe `Monitor` et l'initialiser avec une fonction dont vous aurez seul la maîtrise.
Cette fonction sera éxécutée par un `setInterval` toutes les 5 min ou selon le temps en miliseconds que vous aurez fourni :

```ts
// monitor.ts
import { Monitor, type MonitorInfos, MonitorStatus } from '@cpn-console/shared'

async function monitor(instance: Monitor): Promise<MonitorInfos> {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  // Votre fonction ne devrait jamais lever d'exception
  try {
    // faites des trucs
    // mettez à jour les clés en fonction de votre résultat:
    // instance.lastStatus.message = 'Tout va bien'
    // instance.lastStatus.status = MonitorStatus.OK
  } catch (error) {
    instance.lastStatus.message = 'Error lors la requete'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    // la clé cause n'est pour l'instant jamais retourné à l'utilisateur ni stocké, ça sera pour une prochaine PR
    instance.lastStatus.cause = error
  }
  // c'est bien de le retourner mais on s'en fiche un peu
  return instance.lastStatus
}

export default new Monitor(monitor)
```

### SubscribedHooks

Pour informer le plugin manager sur quels hooks vous voulez exécuter une fonction, vous devez fournir un objet qui aura cette structure :

```ts
  subscribedHooks: {
    createProject: {
      steps: {
        pre: createDsoProjectFirst,
        post: createDsoProjectLast,
      },
    },
    archiveProject: {
      steps: { post: archiveDsoProject },
    },
  },
```

### Fonctions (StepCalls)

Pensez à typer vos fonctions comme suit pour que TS soit capable de vous notifier si vous avez associé un mauvais payload à un hook.

**Vos fonctions ne doivent pas non plus lever d'exceptions non gérées.**
**Et elles doivent toutes retourner un statut !**

Vous pouvez aussi retourner des clés supplémentaires. Ces clés sont accessibles par tous les plugins dans `payload.results[nom_du_plugin]`.

Attention, chaque fonction écrase le résultat de la step d'avant :

```ts
export const createDsoProjectFirst: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    // fais des trucs
    // oh j'ai un payload typé !
    return {
      status: {
        result: 'OK',
        message: 'ça s\'est bien passé' // optionnel si OK
      },
      foo: {
        bar: 'complétement facultatif'
      }
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Ouille !' // Obligatoire pour explique ce qui n'a pas réussi'
      },
    }
  }
}

export const createDsoProjectLast: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    // fais des trucs
    // oh j'ai un payload typé !
    return {
      status: {
        result: 'OK',
        message: `${payload.results.my_plugin.foo.bar} a vraiment bien été crée` // optionnel si OK
      },
      une_clé: {
        newProjectName: 'complétement facultatif'
      }
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Ouille !' // Obligatoire pour explique ce qui n'a pas réussi'
      },
    }
  }
}
```

### Apis

Il n'existe pour l'instant qu'un seul plugin qui exporte une API pour les autres plugins, c'est Vault !
D'autres viendront aider à la séparation des responsabiltés plus tard, stay tuned !

Vous pouvez, comme lui, déclarer des apis sur des hooks. Pour l'uniformité, déclarez que c'est un `extends` de `PluginApi` (qui est vide) :

```ts
// api.ts
import { PluginApi } from '@cpn-console/hooks'

export class ClusterApi extends PluginApi {}
```

```ts
// index.ts
  subscribedHooks: {
    createCluster: {
      api: (args) => new ClusterApi(args.label, args.privacy),
      steps: { post: createCluster },
    },
    deleteCluster: {
      api: (args) => new ClusterApi(args.label),
    },
  },
```

### Dépendances entre les plugins

La section précédente est bien sympathique mais en l'état, le plugin n'a aucune conscience des apis des autres plugins.

> Disclaimer: Les plugins peuvent se parler entre eux mais attention ils ne s'importent jamais les uns les autres. C'est le Plugin Manager qui est en charge de fournir tous les objets nécessaires et de faire passe plat.

Pour y arriver il va falloir deux étapes

1) Le plugin qui expose l'api doit faire un `declare module` :

```ts
// index.ts
declare module '@cpn-console/hooks' {
  interface HookPayloadApis<Args extends DefaultArgs> {
    vault: Args extends CreateClusterExecArgs | DeleteClusterExecArgs
      ? ClusterApi
      : undefined
  }
}
```

1) Le module l'utilisant doit importer les types :

```json
// package.json
{
  "peerDependencies": {
    "my_plugin": "1.2.3"
  }
}
```

```ts
// src/env.d.ts
/// <reference types="my_plugin/types/index.d.ts" />
```

## Conclusion

N'hésitez pas à ouvrir des issues si ce n'est pas clair et bon développement !
