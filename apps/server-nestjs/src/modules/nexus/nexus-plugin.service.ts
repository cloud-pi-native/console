import type { ServiceInfos } from '@cpn-console/hooks'
import type { ConfigType } from '@nestjs/config'
import type { ProjectWithDetails } from './nexus-datastore.service'
import { defaultOrNullish, specificallyEnabled } from '@cpn-console/hooks'
import { DISABLED, ENABLED } from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { nexusConfigFactory } from '../../config/nexus.config'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { PLUGIN_NAME } from './nexus.constants'

@Injectable()
export class NexusPluginService {
  constructor(
    @Inject(nexusConfigFactory.KEY) private readonly nexusConfig: ConfigType<typeof nexusConfigFactory>,
    @Inject(NexusDatastoreService) private readonly datastore: NexusDatastoreService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {}

  infos(): ServiceInfos {
    return {
      name: 'nexus',
      to: () => this.nexusConfig.url,
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

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.datastore.getAdminPluginConfig(PLUGIN_NAME, key)
    if (adminPluginConfig) return adminPluginConfig
    if (!project) return undefined
    return project.plugins?.find(p => p.pluginName === PLUGIN_NAME && p.key === key)?.value
  }

  private getNexusUrl(): string {
    return this.nexusConfig.secretExposeInternalUrl && this.nexusConfig.internalUrl
      ? this.nexusConfig.internalUrl
      : this.nexusConfig.url
  }

  private async isMavenEnabled(project: ProjectWithDetails): Promise<boolean | undefined> {
    const mavenDefault = await this.getAdminOrProjectPluginConfig(project, 'activateMavenRepoDefaultValue')
    const mavenEnabled = project.plugins?.find(p => p.pluginName === PLUGIN_NAME && p.key === 'activateMavenRepo')?.value
    return specificallyEnabled(mavenEnabled)
      || (defaultOrNullish(mavenEnabled) && specificallyEnabled(mavenDefault ?? undefined))
  }

  private async isNpmEnabled(project: ProjectWithDetails): Promise<boolean | undefined> {
    const npmDefault = await this.getAdminOrProjectPluginConfig(project, 'activateNpmRepoDefaultValue')
    const npmEnabled = project.plugins?.find(p => p.pluginName === PLUGIN_NAME && p.key === 'activateNpmRepo')?.value
    return specificallyEnabled(npmEnabled)
      || (defaultOrNullish(npmEnabled) && specificallyEnabled(npmDefault ?? undefined))
  }

  @StartActiveSpan()
  async secrets(projectId: string): Promise<Record<string, string>> {
    const project = await this.datastore.getProject(projectId)
    if (!project) return {}
    const nexusUrl = this.getNexusUrl()
    const out: Record<string, string> = {}
    if (await this.isMavenEnabled(project)) {
      out.MAVEN_REPO_RELEASE = new URL(`${project.slug}-repository-release`, nexusUrl).toString()
      out.MAVEN_REPO_SNAPSHOT = new URL(`${project.slug}-repository-snapshot`, nexusUrl).toString()
    }
    if (await this.isNpmEnabled(project)) {
      out.NPM_REPO = new URL(`${project.slug}-npm`, nexusUrl).toString()
    }
    return out
  }
}
