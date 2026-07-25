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
        section: 'NPM',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Activer le dépôt NPM',
        value: 'disabled',
        description: 'Default: utilise le paramétrage globale de la console. Attention: Nexus met un certain temps pour activer/désactiver les dépôts, un reprovisonnage après plusieurs minutes peut être nécessaire',
      },
      {
        key: 'npmWritePolicy',
        section: 'NPM',
        kind: 'text',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Politique d\'écriture',
        value: 'allow',
        description: 'Politique d\'écriture des dépôts NPM, valeurs possibles: allow / allow_once, deny, replication_only, allow par défaut. Documentation: https://help.sonatype.com/en/configurable-repository-fields.html',
      },
      {
        key: 'activateMavenRepo',
        section: 'Maven',
        kind: 'switch',
        initialValue: 'disabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Activer le dépôt Maven',
        value: 'disabled',
        description: 'Default: utilise le paramétrage globale de la console. Attention: Nexus met un certain temps pour activer/désactiver les dépôts, un reprovisonnage après plusieurs minutes peut être nécessaire',
      },
      {
        key: 'mavenSnapshotWritePolicy',
        section: 'Maven',
        kind: 'text',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Politique d\'écriture du dépôt Snapshot',
        value: 'allow',
        description: 'Politique d\'écriture des dépôts maven, valeurs possibles: allow / allow_once / deny / replication_only, allow par défaut. Documentation: https://help.sonatype.com/en/configurable-repository-fields.html',
      },
      {
        key: 'mavenReleaseWritePolicy',
        section: 'Maven',
        kind: 'text',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: true },
        },
        title: 'Politique d\'écriture du dépôt Release',
        value: 'allow_once',
        description: 'Politique d\'écriture des dépôts maven, valeurs possibles: allow / allow_once / deny / replication_only, allow par défaut. Documentation: https://help.sonatype.com/en/configurable-repository-fields.html',
      },
    ],
    global: [
      {
        key: 'activateNpmRepoDefaultValue',
        section: 'NPM',
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
        section: 'Maven',
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
      {
        key: 'enablePlugin',
        kind: 'switch',
        initialValue: 'enabled',
        permissions: {
          admin: { read: true, write: true },
          user: { read: true, write: false },
        },
        title: 'Activer/Désactiver entièrement le plugin Nexus',
        value: 'enabled',
        description: 'Défaut: Activé',
      },
    ],
  },
} as const satisfies ServiceInfos

export default infos
