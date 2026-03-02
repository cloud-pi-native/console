import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { ProjectWithDetails } from './keycloak-datastore.service'
import { CONSOLE_GROUP_NAME } from './keycloak.constant'

@Injectable()
export class KeycloakService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakService.name)
  private _client: KcAdminClient

  constructor(private readonly configService: ConfigurationService) {
    this._client = new KcAdminClient({
      baseUrl: `${this.configService.keycloakProtocol}://${this.configService.keycloakDomain}`,
      realmName: this.configService.keycloakRealm,
    })
  }

  async onModuleInit() {
    try {
      await this._client.auth({
        grantType: 'client_credentials',
        clientId: this.configService.keycloakClientId!,
        clientSecret: this.configService.keycloakClientSecret!,
      })
      this.logger.log('Keycloak Admin Client authenticated')
    } catch (error) {
      this.logger.error('Failed to authenticate with Keycloak', error)
    }
  }

  async *getAllGroups() {
    let first = 0
    while (true) {
      const fetched = await this._client.groups.find({ first, max: 50, briefRepresentation: false })
      if (fetched.length === 0) break
      for (const group of fetched) {
        yield group
      }
      if (fetched.length < 50) break
      first += 50
    }
  }

  // TODO: May return undefined if group not found in the most recent search
  async getGroupByName(name: string): Promise<GroupRepresentation | undefined> {
    const groups = await this._client.groups.find({ search: name })
    return groups.find(g => g.name === name)
  }

  async getGroupByPath(path: string): Promise<GroupRepresentation | undefined> {
    const parts = path.split('/').filter(Boolean)
    let current: GroupRepresentation | undefined
    for (const name of parts) {
      if (!current) {
        current = await this.getGroupByName(name)
      } else {
        for await (const subgroup of this.getSubGroups(current.id!)) {
          if (subgroup.name === name) {
            current = subgroup
            break
          }
        }
        if (current?.name !== name) return undefined
      }
      if (!current) return undefined
    }
    return current
  }

  async deleteGroup(id: string): Promise<void> {
    await this._client.groups.del({ id })
  }

  async getGroupMembers(groupId: string) {
    return this._client.groups.listMembers({ id: groupId })
  }

  async createGroup(name: string) {
    return this._client.groups.create({ name })
  }

  async addUserToGroup(userId: string, groupId: string) {
    return this._client.users.addToGroup({ id: userId, groupId })
  }

  async removeUserFromGroup(userId: string, groupId: string) {
    return this._client.users.delFromGroup({ id: userId, groupId })
  }

  async* getSubGroups(parentId: string) {
    let first = 0
    while (true) {
      const page = await this._client.groups.listSubGroups({ parentId, briefRepresentation: false, max: 10, first })
      if (page.length === 0) break
      for (const subgroup of page) {
        yield subgroup
      }
      if (page.length < 10) break
      first += 10
    }
  }

  async getOrCreateGroupByPath(path: string) {
    const existingGroup = await this.getGroupByPath(path)
    if (existingGroup) return existingGroup

    const parts = path.split('/').filter(Boolean)
    let parentId: string | undefined
    let current: GroupRepresentation | undefined

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      if (!current) {
        current = await this.getGroupByName(name)
        if (!current) {
          current = await this.createGroup(name)
        }
      } else {
        if (!parentId) parentId = current.id!
        current = await this.getOrCreateSubGroupByName(parentId, name)
      }
      parentId = current.id!
    }

    return { id: parentId } satisfies GroupRepresentation
  }

  async getOrCreateSubGroupByName(parentId: string, name: string) {
    for await (const subgroup of this.getSubGroups(parentId)) {
      if (subgroup.name === name) return subgroup
    }
    const createdGroup = await this._client.groups.createChildGroup({ id: parentId }, { name })
    return { id: createdGroup.id } satisfies GroupRepresentation
  }

  async getOrCreateConsoleGroup(projectGroup: GroupRepresentation) {
    if (!projectGroup.id) {
      throw new Error(`Failed to create or retrieve project group for ${projectGroup.name}`)
    }
    return this.getOrCreateSubGroupByName(projectGroup.id, CONSOLE_GROUP_NAME)
  }

  async getOrCreateEnvironmentGroups(consoleGroup: GroupRepresentation, environment: ProjectWithDetails['environments'][number]) {
    if (!consoleGroup.id) {
      throw new Error(`Failed to create or retrieve console group for ${consoleGroup.name}`)
    }

    const envGroup = await this.getOrCreateSubGroupByName(consoleGroup.id, environment.name)
    if (!envGroup.id) {
      throw new Error(`Failed to create or retrieve environment group for ${environment.name}`)
    }

    const [roGroup, rwGroup] = await Promise.all([
      this.getOrCreateSubGroupByName(envGroup.id, 'RO'),
      this.getOrCreateSubGroupByName(envGroup.id, 'RW'),
    ])
    if (!roGroup.id || !rwGroup.id) {
      throw new Error(`Failed to create or retrieve RO and RW groups for ${environment.name}`)
    }

    return { roGroup, rwGroup }
  }
}
