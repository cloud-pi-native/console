import type { OnModuleInit } from '@nestjs/common'
import type { SonarqubeUserSecret } from '../vault/vault-client.service'
import type { SonarqubeProjectResult, SonarqubeUser } from './sonarqube-client.service'
import type { ProjectWithDetails } from './sonarqube-datastore.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { VaultClientService } from '../vault/vault-client.service'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeDatastoreService } from './sonarqube-datastore.service'
import {
  ADMIN_GROUP_PATH_PLUGIN_KEY,
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_PERMISSION_TEMPLATE_NAME,
  DEFAULT_PROJECT_ADMIN_SUFFIX,
  DEFAULT_PROJECT_DEVELOPER_SUFFIX,
  DEFAULT_PROJECT_DEVOPS_SUFFIX,
  DEFAULT_PROJECT_READONLY_SUFFIX,
  DEFAULT_PROJECT_SECURITY_SUFFIX,
  DEFAULT_READONLY_GROUP_PATH,
  DEFAULT_SECURITY_GROUP_PATH,
  DEFAULT_TEMPLATE_PERMISSIONS,
  GLOBAL_ADMIN_PERMISSIONS,
  PROJECT_ADMIN_PERMISSIONS,
  PROJECT_ADMIN_SUFFIX_PLUGIN_KEY,
  PROJECT_DEVELOPER_PERMISSIONS,
  PROJECT_DEVELOPER_SUFFIX_PLUGIN_KEY,
  PROJECT_DEVOPS_PERMISSIONS,
  PROJECT_DEVOPS_SUFFIX_PLUGIN_KEY,
  PROJECT_READONLY_PERMISSIONS,
  PROJECT_READONLY_SUFFIX_PLUGIN_KEY,
  PROJECT_SECURITY_PERMISSIONS,
  PROJECT_SECURITY_SUFFIX_PLUGIN_KEY,
  READONLY_GROUP_PATH_PLUGIN_KEY,
  ROBOT_PROJECT_PERMISSIONS,
  SECURITY_GROUP_PATH_PLUGIN_KEY,
  SONARQUBE_PLUGIN_NAME,
} from './sonarqube.constants'
import { generateProjectKey, generateRandomPassword } from './sonarqube.utils'

interface SonarqubeRolePaths {
  admin: string[]
  devops: string[]
  developer: string[]
  security: string[]
  readonly: string[]
}

@Injectable()
export class SonarqubeService implements OnModuleInit {
  private readonly logger = new Logger(SonarqubeService.name)

  constructor(
    @Inject(SonarqubeDatastoreService) private readonly datastore: SonarqubeDatastoreService,
    @Inject(SonarqubeClientService) private readonly client: SonarqubeClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultClientService) private readonly vault: VaultClientService,
  ) {
    this.logger.log('SonarqubeService initialized')
  }

  async onModuleInit() {
    await this.init().catch(error => this.logger.error('SonarQube initialization failed', error))
  }

  @StartActiveSpan()
  async init(): Promise<void> {
    if (!this.config.getInternalOrPublicSonarqubeUrl()) {
      this.logger.warn('SonarQube URL not configured — skipping initialization')
      return
    }
    this.logger.log('Initializing SonarQube platform configuration')
    const adminGroupPath = await this.getAdminGroupPath()
    const [readonlyGroupPath, securityGroupPath] = await Promise.all([
      this.getReadonlyGroupPath(),
      this.getSecurityGroupPath(),
    ])
    await this.ensureDefaultPermissionTemplate()
    await Promise.all([
      this.ensureGroupWithGlobalPermissions(adminGroupPath, GLOBAL_ADMIN_PERMISSIONS),
      this.ensureGroup(readonlyGroupPath),
      this.ensureGroup(securityGroupPath),
    ])
    this.logger.log('SonarQube platform configuration initialized')
  }

  @OnEvent('project.upsert')
  @StartActiveSpan()
  async handleUpsert(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project upsert event for ${project.slug}`)
    await this.ensureProjectGroup(project)
    this.logger.log(`SonarQube sync completed for project ${project.slug}`)
  }

  @OnEvent('project.delete')
  @StartActiveSpan()
  async handleDelete(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    this.logger.log(`Handling a project delete event for ${project.slug}`)
    await this.deleteProjectGroup(project)
    this.logger.log(`SonarQube deletion completed for project ${project.slug}`)
  }

  @Cron(CronExpression.EVERY_HOUR)
  @StartActiveSpan()
  async handleCron() {
    const span = trace.getActiveSpan()
    this.logger.log('Starting SonarQube reconciliation')
    await this.init().catch(error => this.logger.error('SonarQube init during cron failed', error))
    const projects = await this.datastore.getAllProjects()
    span?.setAttribute('sonarqube.projects.count', projects.length)
    this.logger.log(`Loaded ${projects.length} projects for SonarQube reconciliation`)
    await this.ensureProjectGroups(projects)
    this.logger.log(`SonarQube reconciliation completed (${projects.length})`)
  }

  @StartActiveSpan()
  private async ensureProjectGroups(projects: ProjectWithDetails[]) {
    const span = trace.getActiveSpan()
    span?.setAttribute('sonarqube.projects.count', projects.length)
    await Promise.all(projects.map(p =>
      this.ensureProjectGroup(p).catch(error =>
        this.logger.error(`Failed to reconcile SonarQube project (slug=${p.slug})`, error),
      ),
    ))
  }

  @StartActiveSpan()
  private async ensureProjectGroup(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    const rolePaths = await this.getProjectRoleGroupPaths(project)
    await Promise.all([
      this.ensureUserAndVault(project.slug, project.slug),
      this.ensureProjectSonarGroups(rolePaths),
      this.ensureProjectRepositories(project, rolePaths),
    ])
  }

  @StartActiveSpan()
  private async deleteProjectGroup(project: ProjectWithDetails) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)

    const sonarProjects = await this.findProjectsForSlug(project.slug)
    span?.setAttribute('sonarqube.projects.count', sonarProjects.length)
    this.logger.log(`Deleting ${sonarProjects.length} SonarQube repositories for project ${project.slug}`)

    await Promise.all(sonarProjects.map(async (sp) => {
      await this.client.deleteProject({ project: sp.key })
      this.logger.verbose(`Deleted SonarQube repository (key=${sp.key})`)
    }))

    const user = await this.findUser(project.slug)
    if (user) {
      await this.client.deactivateUser({ login: project.slug, anonymize: true })
      this.logger.log(`Anonymized SonarQube user (login=${project.slug})`)
    }
    else {
      this.logger.verbose(`SonarQube user not found, skipping anonymization (login=${project.slug})`)
    }

    await this.vault.deleteSonarqubeUser(project.slug)
    this.logger.verbose(`Deleted SonarQube vault credentials (slug=${project.slug})`)
  }

  @StartActiveSpan()
  private async ensureDefaultPermissionTemplate(): Promise<void> {
    this.logger.verbose(`Ensuring SonarQube permission template (name=${DEFAULT_PERMISSION_TEMPLATE_NAME})`)
    await this.client.createPermissionTemplate({ name: DEFAULT_PERMISSION_TEMPLATE_NAME })
    await Promise.all(DEFAULT_TEMPLATE_PERMISSIONS.map(permission =>
      this.client.addPermissionProjectCreatorToTemplate({ templateName: DEFAULT_PERMISSION_TEMPLATE_NAME, permission }),
    ))
    await Promise.all(DEFAULT_TEMPLATE_PERMISSIONS.map(permission =>
      this.client.addPermissionGroupToTemplate({ groupName: 'sonar-administrators', templateName: DEFAULT_PERMISSION_TEMPLATE_NAME, permission }),
    ))
    await this.client.setPermissionDefaultTemplate({ templateName: DEFAULT_PERMISSION_TEMPLATE_NAME })
    this.logger.log(`SonarQube permission template ensured (name=${DEFAULT_PERMISSION_TEMPLATE_NAME})`)
  }

  @StartActiveSpan()
  private async ensureUserAndVault(username: string, projectSlug: string): Promise<void> {
    const existingSecret = await this.vault.readSonarqubeUser(projectSlug)
    const user = await this.findUser(username)
    let newSecret: SonarqubeUserSecret | undefined

    if (!user) {
      this.logger.log(`Creating SonarQube user (login=${username})`)
      const password = generateRandomPassword(30)
      await this.client.createUser({ email: `${projectSlug}@${projectSlug}`, local: 'true', login: username, name: username, password })
      const token = await this.rotateToken(username)
      newSecret = { SONAR_USERNAME: username, SONAR_PASSWORD: password, SONAR_TOKEN: token }
    }
    else if (!existingSecret) {
      this.logger.warn(`SonarQube user exists but vault secret is missing, rotating token (login=${username})`)
      const token = await this.rotateToken(username)
      newSecret = { SONAR_USERNAME: username, SONAR_PASSWORD: 'not initialized', SONAR_TOKEN: token }
    }
    else {
      this.logger.verbose(`SonarQube user already exists with vault credentials (login=${username})`)
    }

    if (newSecret) {
      await this.vault.writeSonarqubeUser(projectSlug, newSecret)
      this.logger.log(`Stored SonarQube credentials in vault (slug=${projectSlug})`)
    }
  }

  private async ensureProjectSonarGroups(rolePaths: SonarqubeRolePaths): Promise<void> {
    const allGroups = [
      ...rolePaths.admin,
      ...rolePaths.devops,
      ...rolePaths.developer,
      ...rolePaths.security,
      ...rolePaths.readonly,
    ]
    await Promise.all(allGroups.map(group => this.ensureGroup(group)))
  }

  @StartActiveSpan()
  private async ensureProjectRepositories(project: ProjectWithDetails, rolePaths: SonarqubeRolePaths): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.slug', project.slug)
    span?.setAttribute('repositories.count', project.repositories.length)

    const [readonlyGroupPath, securityGroupPath, existingSonarProjects] = await Promise.all([
      this.getReadonlyGroupPath(),
      this.getSecurityGroupPath(),
      this.findProjectsForSlug(project.slug),
    ])

    const orphans = existingSonarProjects.filter(sp => !project.repositories.some(r => r.internalRepoName === sp.repository))
    if (orphans.length) this.logger.log(`Removing ${orphans.length} orphan SonarQube repositories for project ${project.slug}`)

    await Promise.all([
      ...orphans.map(async (sp) => {
        await this.client.deleteProject({ project: sp.key })
        this.logger.verbose(`Deleted orphan SonarQube repository (key=${sp.key})`)
      }),
      ...project.repositories.map(async (repository) => {
        const projectKey = generateProjectKey(project.slug, repository.internalRepoName)
        if (!existingSonarProjects.some(sp => sp.repository === repository.internalRepoName)) {
          await this.client.createProject({
            project: projectKey,
            visibility: 'private',
            name: `${project.slug}-${repository.internalRepoName}`,
            mainbranch: 'main',
          })
          this.logger.log(`Created SonarQube repository (key=${projectKey})`)
        }
        await this.ensureProjectPermissions(projectKey, project.slug, rolePaths, readonlyGroupPath, securityGroupPath)
        this.logger.verbose(`Ensured permissions on SonarQube repository (key=${projectKey})`)
      }),
    ])
  }

  private async ensureProjectPermissions(
    projectKey: string,
    login: string,
    rolePaths: SonarqubeRolePaths,
    readonlyGroupPath: string,
    securityGroupPath: string,
  ): Promise<void> {
    await Promise.all([
      ...ROBOT_PROJECT_PERMISSIONS.map(permission =>
        this.client.addPermissionUser({ projectKey, permission, login }),
      ),
      ...buildGroupPermissions(rolePaths, readonlyGroupPath, securityGroupPath).flatMap(({ groupName, permissions }) =>
        permissions.map(permission => this.client.addPermissionGroup({ projectKey, permission, groupName })),
      ),
    ])
  }

  private async ensureGroupWithGlobalPermissions(groupName: string, permissions: readonly string[]): Promise<void> {
    await this.ensureGroup(groupName)
    await Promise.all(permissions.map(permission =>
      this.client.addPermissionGroup({ groupName, permission }),
    ))
  }

  private async ensureGroup(groupName: string): Promise<void> {
    const result = await this.client.searchUserGroup({ q: groupName })
    if (!result.groups.some(g => g.name === groupName)) {
      await this.client.createUserGroups({ name: groupName })
      this.logger.log(`Created SonarQube group (name=${groupName})`)
    }
    else {
      this.logger.verbose(`SonarQube group already exists (name=${groupName})`)
    }
  }

  private async rotateToken(login: string): Promise<string> {
    const name = `Sonar Token for ${login}`
    await this.client.revokeUserToken({ login, name }).catch(() => {})
    const { token } = await this.client.generateUserToken({ login, name })
    this.logger.log(`Rotated SonarQube token (login=${login})`)
    return token
  }

  private async getAdminGroupPath(): Promise<string> {
    const config = await this.datastore.getAdminPluginConfig(SONARQUBE_PLUGIN_NAME, ADMIN_GROUP_PATH_PLUGIN_KEY)
    return config ?? DEFAULT_ADMIN_GROUP_PATH
  }

  private async getReadonlyGroupPath(): Promise<string> {
    const config = await this.datastore.getAdminPluginConfig(SONARQUBE_PLUGIN_NAME, READONLY_GROUP_PATH_PLUGIN_KEY)
    return config ?? DEFAULT_READONLY_GROUP_PATH
  }

  private async getSecurityGroupPath(): Promise<string> {
    const config = await this.datastore.getAdminPluginConfig(SONARQUBE_PLUGIN_NAME, SECURITY_GROUP_PATH_PLUGIN_KEY)
    return config ?? DEFAULT_SECURITY_GROUP_PATH
  }

  private async getAdminOrProjectPluginConfig(project: ProjectWithDetails, key: string): Promise<string | undefined> {
    const adminPluginConfig = await this.datastore.getAdminPluginConfig(SONARQUBE_PLUGIN_NAME, key)
    if (adminPluginConfig) return adminPluginConfig
    return getProjectPluginConfig(project, key) ?? undefined
  }

  private async getProjectRoleGroupPaths(project: ProjectWithDetails): Promise<SonarqubeRolePaths> {
    const [admin, devops, developer, security, readonly] = await Promise.all([
      this.getProjectAdminGroupPaths(project),
      this.getProjectDevopsGroupPaths(project),
      this.getProjectDeveloperGroupPaths(project),
      this.getProjectSecurityGroupPaths(project),
      this.getProjectReadonlyGroupPaths(project),
    ])
    return { admin, devops, developer, security, readonly }
  }

  private async getProjectAdminGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_ADMIN_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_ADMIN_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_ADMIN_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectDevopsGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_DEVOPS_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVOPS_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_DEVOPS_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectDeveloperGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_DEVELOPER_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_DEVELOPER_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_DEVELOPER_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectSecurityGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_SECURITY_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_SECURITY_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_SECURITY_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async getProjectReadonlyGroupPaths(project: ProjectWithDetails): Promise<string[]> {
    const projectConfig = getProjectPluginConfig(project, PROJECT_READONLY_SUFFIX_PLUGIN_KEY)
    const globalConfig = await this.getAdminOrProjectPluginConfig(project, PROJECT_READONLY_SUFFIX_PLUGIN_KEY)
    const raw = projectConfig ?? globalConfig ?? DEFAULT_PROJECT_READONLY_SUFFIX
    return generateProjectRoleGroupPath(project.slug, raw)
  }

  private async findUser(login: string): Promise<SonarqubeUser | undefined> {
    let page = 1
    const pageSize = 100
    while (true) {
      const response = await this.client.searchUsers({ q: login, ps: pageSize, p: page })
      const found = response.users.find(u => u.login === login)
      if (found) return found
      if (!response.users.length || response.paging.pageIndex * response.paging.pageSize >= response.paging.total) return undefined
      page++
    }
  }

  private async findProjectsForSlug(projectSlug: string): Promise<SonarqubeProjectResult[]> {
    let found: SonarqubeProjectResult[] = []
    let page = 0
    const pageSize = 100
    let total = 0
    do {
      page++
      const result = await this.client.searchProject({ q: projectSlug, p: page, ps: pageSize })
      total = result.paging.total
      found = [...found, ...filterProjectsOwningSlug(result.components, projectSlug)]
    } while (page * pageSize < total)
    return found
  }
}

function getProjectPluginConfig(project: ProjectWithDetails, key: string) {
  return project.plugins?.find(p => p.key === key)?.value
}

function generateProjectRoleGroupPath(projectSlug: string, rawGroupPathSuffixes: string): string[] {
  return rawGroupPathSuffixes
    .split(',')
    .map(path => path.trim())
    .filter(Boolean)
    .map(suffix => `/${projectSlug}${suffix}`)
}

function buildGroupPermissions(
  rolePaths: SonarqubeRolePaths,
  readonlyGroupPath: string,
  securityGroupPath: string,
): { groupName: string, permissions: readonly string[] }[] {
  return [
    ...rolePaths.admin.map(groupName => ({ groupName, permissions: PROJECT_ADMIN_PERMISSIONS })),
    ...rolePaths.devops.map(groupName => ({ groupName, permissions: PROJECT_DEVOPS_PERMISSIONS })),
    ...rolePaths.developer.map(groupName => ({ groupName, permissions: PROJECT_DEVELOPER_PERMISSIONS })),
    ...rolePaths.security.map(groupName => ({ groupName, permissions: PROJECT_SECURITY_PERMISSIONS })),
    ...rolePaths.readonly.map(groupName => ({ groupName, permissions: PROJECT_READONLY_PERMISSIONS })),
    { groupName: securityGroupPath, permissions: PROJECT_SECURITY_PERMISSIONS },
    { groupName: readonlyGroupPath, permissions: PROJECT_READONLY_PERMISSIONS },
  ]
}

function filterProjectsOwningSlug(
  components: { key: string }[],
  projectSlug: string,
): SonarqubeProjectResult[] {
  return components.reduce<SonarqubeProjectResult[]>((acc, { key: sonarKey }) => {
    const parts = sonarKey.split('-')
    parts.pop()
    for (let i = parts.length - 1; i > 0; i--) {
      const project = parts.slice(0, i).join('-')
      const repository = parts.slice(i).join('-')
      if (sonarKey.startsWith(`${project}-${repository}-`) && project === projectSlug) {
        acc.push({ projectSlug, repository, key: sonarKey })
        break
      }
    }
    return acc
  }, [])
}
