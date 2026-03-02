import type { OnModuleInit } from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import KcAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'
import type { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'

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
        for await (const subgroup of this.getSubgroups(current.id!)) {
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

  async* getSubgroups(parentId: string) {
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

  async getOrCreateChildGroupByName(parentId: string, name: string) {
    for await (const subgroup of this.getSubgroups(parentId)) {
      if (subgroup.name === name) return subgroup
    }
    const createdGroup = await this._client.groups.createChildGroup({ id: parentId }, { name })
    return { id: createdGroup.id } satisfies GroupRepresentation
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
        current = await this.getOrCreateChildGroupByName(parentId, name)
      }
      parentId = current.id!
    }

    return { id: parentId } satisfies GroupRepresentation
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
}
