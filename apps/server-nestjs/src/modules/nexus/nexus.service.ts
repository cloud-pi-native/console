import type { NexusPrivilege } from './nexus-client.service'
import type { ProjectWithDetails } from './nexus-datastore.service'
import type {
  MavenHostedRepoKind,
} from './nexus.utils'
import { specificallyEnabled } from '@cpn-console/hooks'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultError } from '../vault/vault-http-client.service.js'
import { NexusClientService } from './nexus-client.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import {
  DEFAULT_MAVEN_RELEASE_WRITE_POLICY,
  DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY,
  DEFAULT_NPM_WRITE_POLICY,
  DEFAULT_PLATFORM_READ_GROUP_PATHS,
  DEFAULT_PLATFORM_READONLY_GROUP_PATH,
  DEFAULT_PLATFORM_SECURITY_GROUP_PATH,
  DEFAULT_PLATFORM_WRITE_GROUP_PATHS,
  DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES,
  DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES,
  NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO,
  NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO,
  NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY,
  NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY,
  NEXUS_CONFIG_KEY_NPM_WRITE_POLICY,
  NEXUS_PLUGIN_NAME,
  PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY,
  PLATFORM_READONLY_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_SECURITY_GROUP_PATH_PLUGIN_KEY,
  PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY,
  PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
  PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY,
} from './nexus.constants'
import {
  generateMavenHostedRepoName,
  generateNpmHostedRepoName,
  generateRandomPassword,
  getPluginConfig,
  getProjectVaultPath,
} from './nexus.utils'

export interface EnsureMavenReposOptions {
  snapshotWritePolicy: string
  releaseWritePolicy: string
}

@Injectable()
export class NexusService {
  private readonly logger = new Logger(NexusService.name)

  constructor(
    @Inject(NexusDatastoreService) private readonly nexusDatastore: NexusDatastoreService,
    @Inject(NexusClientService) private readonly client: NexusClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('NexusService initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project upsert for ${project.slug}`)
    await this.ensureProject(project)
    const projects = await this.nexusDatastore.getAllProjects()
    await this.ensurePlatformRoles(projects)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling project delete for ${project.slug}`)
    await this.deleteProject(project)
    const projects = await this.nexusDatastore.getAllProjects()
    await this.ensurePlatformRoles(projects)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting Nexus reconciliation')
    const projects = await this.nexusDatastore.getAllProjects()
    span?.setAttribute('nexus.projects.count', projects.length)
    await this.ensureProjects(projects)
    await this.ensurePlatformRoles(projects)
  }

  @StartActiveSpan()
  private async ensureProjects(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('nexus.projects.count', projects.length)
    await Promise.all(projects.map(p => this.ensureProject(p)))
  }

  @StartActiveSpan()
  private async ensureProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)

    const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO)) ?? false
    const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO)) ?? false

    const mavenSnapshotWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_SNAPSHOT_WRITE_POLICY) ?? DEFAULT_MAVEN_SNAPSHOT_WRITE_POLICY
    const mavenReleaseWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_MAVEN_RELEASE_WRITE_POLICY) ?? DEFAULT_MAVEN_RELEASE_WRITE_POLICY
    const npmWritePolicy = getPluginConfig(project, NEXUS_CONFIG_KEY_NPM_WRITE_POLICY) ?? DEFAULT_NPM_WRITE_POLICY

    await Promise.all([
      enableMaven
        ? this.ensureMavenRepos(project, { snapshotWritePolicy: mavenSnapshotWritePolicy, releaseWritePolicy: mavenReleaseWritePolicy })
        : this.deleteMavenRepos(project),
      enableNpm
        ? this.ensureNpmRepos(project, npmWritePolicy)
        : this.deleteNpmRepos(project),
    ])

    const privileges = [
      ...(enableMaven
        ? [
            generateMavenGroupPrivilegeName(project),
            generateMavenHostedPrivilegeName(project, 'release'),
            generateMavenHostedPrivilegeName(project, 'snapshot'),
          ]
        : []),
      ...(enableNpm
        ? [
            generateNpmGroupPrivilegeName(project),
            generateNpmHostedPrivilegeName(project),
          ]
        : []),
    ]
    const readOnlyPrivileges = [
      ...(enableMaven
        ? [
            generateMavenGroupPrivilegeNameReadonly(project),
            generateMavenHostedPrivilegeNameReadonly(project, 'release'),
            generateMavenHostedPrivilegeNameReadonly(project, 'snapshot'),
          ]
        : []),
      ...(enableNpm
        ? [
            generateNpmGroupPrivilegeNameReadonly(project),
            generateNpmHostedPrivilegeNameReadonly(project),
          ]
        : []),
    ]
    await this.ensureRole(project, privileges)
    await this.ensureUser(project)
    await this.ensureProjectGroupRoles(project, { readOnlyPrivileges, writePrivileges: privileges })
  }

  private async upsertPrivilege(body: NexusPrivilege) {
    const existing = await this.client.getSecurityPrivileges(body.name)
    if (!existing) {
      await this.client.createSecurityPrivilegesRepositoryView(body)
      return
    }
    await this.client.updateSecurityPrivilegesRepositoryView(body.name, body)
  }

  private async ensureMavenHostedRepo(repoName: string, writePolicy: string) {
    const existing = await this.client.getRepositoriesMavenHosted(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
        writePolicy,
      },
      component: { proprietaryComponents: true },
      maven: {
        versionPolicy: 'MIXED',
        layoutPolicy: 'STRICT',
        contentDisposition: 'ATTACHMENT',
      },
    }
    if (!existing) {
      await this.client.createRepositoriesMavenHosted(body)
      return
    }
    await this.client.updateRepositoriesMavenHosted(repoName, body)
  }

  private async ensureNpmHostedRepo(repoName: string, writePolicy: string) {
    const existing = await this.client.getRepositoriesNpmHosted(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
        writePolicy,
      },
      component: { proprietaryComponents: true },
    }
    if (!existing) {
      await this.client.createRepositoriesNpmHosted(body)
      return
    }
    await this.client.updateRepositoriesNpmHosted(repoName, body)
  }

  private async ensureNpmGroupRepo(repoName: string, memberNames: string[]) {
    const existing = await this.client.getRepositoriesNpmGroup(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames,
      },
    }
    if (!existing) {
      await this.client.postRepositoriesNpmGroup(body)
      return
    }
    await this.client.putRepositoriesNpmGroup(repoName, body)
  }

  private async ensureMavenHostedRepos(args: {
    releaseRepoName: string
    snapshotRepoName: string
    releaseWritePolicy: string
    snapshotWritePolicy: string
  }) {
    await Promise.all([
      this.ensureMavenHostedRepo(args.snapshotRepoName, args.snapshotWritePolicy),
      this.ensureMavenHostedRepo(args.releaseRepoName, args.releaseWritePolicy),
    ])
  }

  private async ensureMavenRepos(project: ProjectWithDetails, options: EnsureMavenReposOptions) {
    const releaseRepoName = generateMavenHostedRepoName(project, 'release')
    const snapshotRepoName = generateMavenHostedRepoName(project, 'snapshot')
    const groupRepoName = generateMavenGroupRepoName(project)

    const releasePrivilege = generateMavenHostedPrivilegeName(project, 'release')
    const snapshotPrivilege = generateMavenHostedPrivilegeName(project, 'snapshot')
    const groupPrivilege = generateMavenGroupPrivilegeName(project)
    const releasePrivilegeReadonly = generateMavenHostedPrivilegeNameReadonly(project, 'release')
    const snapshotPrivilegeReadonly = generateMavenHostedPrivilegeNameReadonly(project, 'snapshot')
    const groupPrivilegeReadonly = generateMavenGroupPrivilegeNameReadonly(project)

    await this.ensureMavenHostedRepos({
      releaseRepoName,
      snapshotRepoName,
      releaseWritePolicy: options.releaseWritePolicy,
      snapshotWritePolicy: options.snapshotWritePolicy,
    })

    await this.ensureMavenGroupRepo(
      groupRepoName,
      [releaseRepoName, snapshotRepoName, 'maven-public'],
    )

    const privilegesToEnsureWrite = [
      { repo: releaseRepoName, privilege: releasePrivilege },
      { repo: snapshotRepoName, privilege: snapshotPrivilege },
      { repo: groupRepoName, privilege: groupPrivilege },
    ]
    const privilegesToEnsureReadonly = [
      { repo: releaseRepoName, privilege: releasePrivilegeReadonly },
      { repo: snapshotRepoName, privilege: snapshotPrivilegeReadonly },
      { repo: groupRepoName, privilege: groupPrivilegeReadonly },
    ]
    await Promise.all([
      this.ensureRepositoryViewPrivileges({
        project,
        type: 'maven',
        format: 'maven2',
        entries: privilegesToEnsureWrite,
        actions: ['all'],
      }),
      this.ensureRepositoryViewPrivileges({
        project,
        type: 'maven',
        format: 'maven2',
        entries: privilegesToEnsureReadonly,
        actions: ['read', 'browse'],
      }),
    ])
  }

  private async ensureMavenGroupRepo(repoName: string, memberNames: string[]) {
    const existing = await this.client.getRepositoriesMavenGroup(repoName)
    const body = {
      name: repoName,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames,
      },
    }
    if (!existing) {
      await this.client.createRepositoriesMavenGroup(body)
      return
    }
    await this.client.updateRepositoriesMavenGroup(repoName, body)
  }

  private async ensureRepositoryViewPrivileges(args: {
    project: ProjectWithDetails
    type: string
    format: string
    entries: Array<{ repo: string, privilege: string }>
    actions: string[]
  }) {
    for (const entry of args.entries) {
      await this.upsertPrivilege({
        type: args.type,
        name: entry.privilege,
        description: `Privilege for organization ${args.project.slug} for repo ${entry.repo}`,
        actions: args.actions,
        format: args.format,
        repository: entry.repo,
      })
    }
  }

  private async deleteMavenRepos(project: ProjectWithDetails) {
    const repoPaths = [
      generateMavenGroupRepoName(project),
      generateMavenHostedRepoName(project, 'release'),
      generateMavenHostedRepoName(project, 'snapshot'),
    ]
    const privileges = [
      generateMavenGroupPrivilegeName(project),
      generateMavenHostedPrivilegeName(project, 'release'),
      generateMavenHostedPrivilegeName(project, 'snapshot'),
      generateMavenGroupPrivilegeNameReadonly(project),
      generateMavenHostedPrivilegeNameReadonly(project, 'release'),
      generateMavenHostedPrivilegeNameReadonly(project, 'snapshot'),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureNpmRepos(project: ProjectWithDetails, writePolicy: string) {
    const hostedRepoName = generateNpmHostedRepoName(project)
    const groupRepoName = generateNpmGroupRepoName(project)

    const hostedPrivilege = generateNpmHostedPrivilegeName(project)
    const groupPrivilege = generateNpmGroupPrivilegeName(project)
    const hostedPrivilegeReadonly = generateNpmHostedPrivilegeNameReadonly(project)
    const groupPrivilegeReadonly = generateNpmGroupPrivilegeNameReadonly(project)

    await this.ensureNpmHostedRepo(hostedRepoName, writePolicy)
    await this.ensureNpmGroupRepo(groupRepoName, [hostedRepoName])

    const privilegesToEnsureWrite = [
      { repo: hostedRepoName, privilege: hostedPrivilege },
      { repo: groupRepoName, privilege: groupPrivilege },
    ]
    const privilegesToEnsureReadonly = [
      { repo: hostedRepoName, privilege: hostedPrivilegeReadonly },
      { repo: groupRepoName, privilege: groupPrivilegeReadonly },
    ]
    await Promise.all([
      this.ensureRepositoryViewPrivileges({
        project,
        type: 'npm',
        format: 'npm',
        entries: privilegesToEnsureWrite,
        actions: ['all'],
      }),
      this.ensureRepositoryViewPrivileges({
        project,
        type: 'npm',
        format: 'npm',
        entries: privilegesToEnsureReadonly,
        actions: ['read', 'browse'],
      }),
    ])
  }

  private async deleteNpmRepos(project: ProjectWithDetails) {
    const repoPaths = [
      generateNpmGroupRepoName(project),
      generateNpmHostedRepoName(project),
    ]
    const privileges = [
      generateNpmGroupPrivilegeName(project),
      generateNpmHostedPrivilegeName(project),
      generateNpmGroupPrivilegeNameReadonly(project),
      generateNpmHostedPrivilegeNameReadonly(project),
    ]
    await Promise.all(privileges.map(privilege => this.client.deleteSecurityPrivileges(privilege)))
    await Promise.all(repoPaths.map(repo => this.client.deleteRepositoriesByName(repo)))
  }

  private async ensureRole(project: ProjectWithDetails, privileges: string[]) {
    const roleId = `${project.slug}-ID`
    const role = await this.client.getSecurityRoles(roleId)
    if (!role) {
      await this.client.createSecurityRoles({
        id: roleId,
        name: `${project.slug}-role`,
        description: 'desc',
        privileges,
      })
      return
    }
    await this.client.updateSecurityRoles(roleId, {
      id: roleId,
      name: `${project.slug}-role`,
      privileges,
    })
  }

  private async ensureUser(project: ProjectWithDetails) {
    const vaultPath = getProjectVaultPath(this.config.projectRootDir, project.slug, 'tech/NEXUS')
    let existingPassword: string | undefined
    try {
      existingPassword = await this.vault.read(vaultPath).then(res => res.data?.NEXUS_PASSWORD)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') {
        existingPassword = undefined
      } else {
        throw error
      }
    }

    const ensuredPassword = existingPassword ?? generateRandomPassword(30)
    const users = await this.client.getSecurityUsers(project.slug)
    const existing = users.find(u => u.userId === project.slug)
    if (existing) {
      if (!existingPassword || existingPassword !== ensuredPassword) {
        await this.client.updateSecurityUsersChangePassword(project.slug, ensuredPassword)
      }
    } else {
      await this.client.createSecurityUsers({
        userId: project.slug,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        emailAddress: project.owner.email,
        password: ensuredPassword,
        status: 'active',
        roles: [`${project.slug}-ID`],
      })
    }

    await this.vault.write({
      NEXUS_PASSWORD: ensuredPassword,
      NEXUS_USERNAME: project.slug,
    }, vaultPath)
  }

  private async ensureSecurityRole(args: { id: string, privileges: string[] }) {
    const role = await this.client.getSecurityRoles(args.id)
    if (!role) {
      await this.client.createSecurityRoles({
        id: args.id,
        name: args.id,
        description: 'desc',
        privileges: args.privileges,
      })
      return
    }
    await this.client.updateSecurityRoles(args.id, {
      id: args.id,
      name: args.id,
      privileges: args.privileges,
    })
  }

  private async getOptionalConfigValue(project: ProjectWithDetails, key: string) {
    const projectValue = getPluginConfig(project, key)
    if (projectValue) return projectValue
    return await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, key)
  }

  private async getEffectiveConfigValue(project: ProjectWithDetails, key: string, defaultValue: string) {
    const value = await this.getOptionalConfigValue(project, key)
    return value ?? defaultValue
  }

  private async ensureProjectGroupRoles(project: ProjectWithDetails, args: { readOnlyPrivileges: string[], writePrivileges: string[] }) {
    const rawWriteSuffixes = await this.getOptionalConfigValue(project, PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY)
      ?? DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES

    const rawReadSuffixes = await this.getOptionalConfigValue(project, PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY)
      ?? DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES

    const writeGroupPaths = generateProjectRoleGroupPath(project.slug, rawWriteSuffixes || DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES)
    const readGroupPaths = generateProjectRoleGroupPath(project.slug, rawReadSuffixes || DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES)

    const byId = new Map<string, string[]>()
    for (const groupPath of writeGroupPaths) byId.set(toNexusRoleIdFromGroupPath(groupPath), args.writePrivileges)
    for (const groupPath of readGroupPaths) byId.set(toNexusRoleIdFromGroupPath(groupPath), args.readOnlyPrivileges)

    await Promise.all(Array.from(byId.entries(), ([id, privileges]) => this.ensureSecurityRole({ id, privileges })))
  }

  private async ensurePlatformRoles(projects: ProjectWithDetails[]) {
    const rawWriteGroupPaths = await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, PLATFORM_WRITE_GROUP_PATHS_PLUGIN_KEY)
      ?? await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, PLATFORM_ADMIN_GROUP_PATH_PLUGIN_KEY)
      ?? DEFAULT_PLATFORM_WRITE_GROUP_PATHS

    const rawReadGroupPaths = await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, PLATFORM_READ_GROUP_PATHS_PLUGIN_KEY)
      ?? [
        await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, PLATFORM_READONLY_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_PLATFORM_READONLY_GROUP_PATH,
        await this.nexusDatastore.getAdminPluginConfig(NEXUS_PLUGIN_NAME, PLATFORM_SECURITY_GROUP_PATH_PLUGIN_KEY) ?? DEFAULT_PLATFORM_SECURITY_GROUP_PATH,
      ].join(',')
      ?? DEFAULT_PLATFORM_READ_GROUP_PATHS

    const readonlyPrivileges = new Set<string>()
    const writePrivileges = new Set<string>()
    for (const project of projects) {
      const computed = computeProjectPrivileges(project)
      for (const privilege of computed.readOnly) readonlyPrivileges.add(privilege)
      for (const privilege of computed.write) writePrivileges.add(privilege)
    }

    const entries: Array<{ groupPath: string, privileges: string[] }> = [
      ...parseOidcGroupPaths(rawReadGroupPaths || DEFAULT_PLATFORM_READ_GROUP_PATHS).map(groupPath => ({ groupPath, privileges: [...readonlyPrivileges] })),
      ...parseOidcGroupPaths(rawWriteGroupPaths || DEFAULT_PLATFORM_WRITE_GROUP_PATHS).map(groupPath => ({ groupPath, privileges: [...writePrivileges] })),
    ]

    await Promise.all(entries.map(entry => this.ensureSecurityRole({
      id: toNexusRoleIdFromGroupPath(entry.groupPath),
      privileges: entry.privileges,
    })))
  }

  private async deleteProjectGroupRoles(project: ProjectWithDetails) {
    const rawWriteSuffixes = await this.getOptionalConfigValue(project, PROJECT_WRITE_GROUP_PATH_SUFFIXES_PLUGIN_KEY)
      ?? DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES

    const rawReadSuffixes = await this.getOptionalConfigValue(project, PROJECT_READ_GROUP_PATH_SUFFIXES_PLUGIN_KEY)
      ?? DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES

    const groupPaths = [
      ...generateProjectRoleGroupPath(project.slug, rawWriteSuffixes || DEFAULT_PROJECT_WRITE_GROUP_PATH_SUFFIXES),
      ...generateProjectRoleGroupPath(project.slug, rawReadSuffixes || DEFAULT_PROJECT_READ_GROUP_PATH_SUFFIXES),
    ]

    const ids = [...new Set(groupPaths.map(toNexusRoleIdFromGroupPath))]
    await Promise.all(ids.map(id => this.client.deleteSecurityRoles(id)))
  }

  @StartActiveSpan()
  private async deleteProject(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    await Promise.all([
      this.deleteMavenRepos(project),
      this.deleteNpmRepos(project),
    ])

    await Promise.all([
      this.deleteProjectGroupRoles(project),
      this.client.deleteSecurityRoles(`${project.slug}-ID`),
      this.client.deleteSecurityUsers(project.slug),
    ])

    const vaultPath = getProjectVaultPath(this.config.projectRootDir, project.slug, 'tech/NEXUS')
    try {
      await this.vault.delete(vaultPath)
    } catch (error) {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    }
  }
}

function generateMavenHostedPrivilegeName(project: ProjectWithDetails, kind: MavenHostedRepoKind) {
  return `${project.slug}-privilege-${kind}`
}

function generateMavenGroupRepoName(project: ProjectWithDetails) {
  return `${project.slug}-repository-group`
}

function generateMavenGroupPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-privilege-group`
}

function generateNpmHostedPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-npm-privilege`
}

function generateNpmGroupRepoName(project: ProjectWithDetails) {
  return `${project.slug}-npm-group`
}

function generateNpmGroupPrivilegeName(project: ProjectWithDetails) {
  return `${project.slug}-npm-group-privilege`
}

function generateMavenHostedPrivilegeNameReadonly(project: ProjectWithDetails, kind: MavenHostedRepoKind) {
  return `${generateMavenHostedPrivilegeName(project, kind)}-ro`
}

function generateMavenGroupPrivilegeNameReadonly(project: ProjectWithDetails) {
  return `${generateMavenGroupPrivilegeName(project)}-ro`
}

function generateNpmHostedPrivilegeNameReadonly(project: ProjectWithDetails) {
  return `${generateNpmHostedPrivilegeName(project)}-ro`
}

function generateNpmGroupPrivilegeNameReadonly(project: ProjectWithDetails) {
  return `${generateNpmGroupPrivilegeName(project)}-ro`
}

function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string) {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => `/${projectSlug}${path}`)
}

function parseOidcGroupPaths(rawGroupPaths: string) {
  return rawGroupPaths
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
}

function toNexusRoleIdFromGroupPath(groupPath: string) {
  const trimmed = groupPath.trim()
  if (!trimmed) return 'kc'
  const withoutLeadingSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  const normalized = withoutLeadingSlash.replaceAll('/', '-')
  return `kc-${normalized}`
}

function computeProjectPrivileges(project: ProjectWithDetails) {
  const enableMaven = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_MAVEN_REPO)) ?? false
  const enableNpm = specificallyEnabled(getPluginConfig(project, NEXUS_CONFIG_KEY_ACTIVATE_NPM_REPO)) ?? false

  const write = [
    ...(enableMaven
      ? [
          generateMavenGroupPrivilegeName(project),
          generateMavenHostedPrivilegeName(project, 'release'),
          generateMavenHostedPrivilegeName(project, 'snapshot'),
        ]
      : []),
    ...(enableNpm
      ? [
          generateNpmGroupPrivilegeName(project),
          generateNpmHostedPrivilegeName(project),
        ]
      : []),
  ]

  const readOnly = [
    ...(enableMaven
      ? [
          generateMavenGroupPrivilegeNameReadonly(project),
          generateMavenHostedPrivilegeNameReadonly(project, 'release'),
          generateMavenHostedPrivilegeNameReadonly(project, 'snapshot'),
        ]
      : []),
    ...(enableNpm
      ? [
          generateNpmGroupPrivilegeNameReadonly(project),
          generateNpmHostedPrivilegeNameReadonly(project),
        ]
      : []),
  ]

  return { readOnly, write }
}
