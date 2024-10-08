import type { ServiceInfos } from '@cpn-console/hooks'

const infos = {
  name: 'nexus',
  title: 'Nexus',
  imgSrc: '/img/nexus.png',
  description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
  config: {
    project: [
      {
        key: 'activateNpmRepo',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Créer un dépôt NPM privé',
        value: 'disabled',
        description: 'Default: utilise le paramétrage globale de la console',
      },
      {
        key: 'activateMavenRepo',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Créer un dépôt MAVEN privé',
        value: 'disabled',
        description: 'Default: utilise le paramétrage globale de la console',
      },
    ],
    global: [
      {
        key: 'activateNpmRepoDefaultValue',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: false },
        },
        title: 'Créer un dépôt NPM privé (comportement par défaut des projets)',
        value: 'disabled',
        description: 'Défaut au niveau global signifie: Désactivé',
      },
      {
        key: 'activateMavenRepoDefaultValue',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: false },
        },
        title: 'Créer un dépôt MAVEN privé (comportement par défaut des projets)',
        value: 'disabled',
        description: 'Défaut au niveau global signifie: Désactivé',
      },
    ],
  },
} as const satisfies ServiceInfos

export default infos
