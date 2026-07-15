import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { AUTO_SYNC_PLUGIN_KEY, SUSPENDED_PLUGIN_KEY } from './nexus.constants'

@Injectable()
export class NexusPluginService {
  constructor(
    @Inject(ConfigurationService)
    private readonly config: ConfigurationService,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'nexus',
      to: () => {
        if (!this.config.nexusUrl) return undefined
        return this.config.nexusUrl
      },
      title: 'Nexus',
      imgSrc: '/img/nexus.png',
      description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
      config: {
        project: [
          {
            kind: 'switch',
            key: SUSPENDED_PLUGIN_KEY,
            initialValue: ENABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Suspendre le projet',
            value: ENABLED,
            description: 'Suspendre la synchronisation Nexus pour ce projet',
          },
          {
            kind: 'switch',
            key: AUTO_SYNC_PLUGIN_KEY,
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Synchronisation automatique Nexus',
            value: DISABLED,
            description: 'Synchroniser automatiquement le projet Nexus',
          },
          {
            key: 'activateNpmRepo',
            section: 'NPM',
            kind: 'switch',
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Activer le dépôt NPM',
            value: DISABLED,
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
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: true, write: true },
            },
            title: 'Activer le dépôt Maven',
            value: DISABLED,
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
            key: 'platformWriteGroupPaths',
            kind: 'text',
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Chemins des groupes OIDC plateforme en écriture',
            value: '/console/admin',
            description: 'Liste séparée par des virgules des chemins des groupes OIDC ayant accès en écriture aux dépôts Nexus de la plateforme',
            placeholder: '/console/admin',
          },
          {
            key: 'platformReadGroupPaths',
            kind: 'text',
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Chemins des groupes OIDC plateforme en lecture',
            value: '/console/readonly,/console/security',
            description: 'Liste séparée par des virgules des chemins des groupes OIDC ayant accès en lecture aux dépôts Nexus de la plateforme',
            placeholder: '/console/readonly,/console/security',
          },
          {
            key: 'projectWriteGroupPathSuffixes',
            kind: 'text',
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Suffixes des groupes OIDC projet en écriture',
            value: '/console/admin,/console/devops',
            description: 'Liste séparée par des virgules des suffixes des chemins des groupes OIDC ayant accès en écriture aux dépôts Nexus du projet',
            placeholder: '/console/admin,/console/devops',
          },
          {
            key: 'projectReadGroupPathSuffixes',
            kind: 'text',
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Suffixes des groupes OIDC projet en lecture',
            value: '/console/readonly,/console/security,/console/developer',
            description: 'Liste séparée par des virgules des suffixes des chemins des groupes OIDC ayant accès en lecture aux dépôts Nexus du projet',
            placeholder: '/console/readonly,/console/security,/console/developer',
          },
          {
            key: 'activateNpmRepoDefaultValue',
            section: 'NPM',
            kind: 'switch',
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Créer un dépôt NPM privé (comportement par défaut des projets)',
            value: DISABLED,
            description: 'Défaut au niveau global signifie: Désactivé',
          },
          {
            key: 'activateMavenRepoDefaultValue',
            section: 'Maven',
            kind: 'switch',
            initialValue: DISABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Créer un dépôt MAVEN privé (comportement par défaut des projets)',
            value: DISABLED,
            description: 'Défaut au niveau global signifie: Désactivé',
          },
          {
            key: 'enablePlugin',
            kind: 'switch',
            initialValue: ENABLED,
            permissions: {
              admin: { read: true, write: true },
              user: { read: false, write: false },
            },
            title: 'Activer/Désactiver entièrement le plugin Nexus',
            value: ENABLED,
            description: 'Défaut: Activé',
          },
        ],
      },
    } as const satisfies ServiceInfos
  }
}
