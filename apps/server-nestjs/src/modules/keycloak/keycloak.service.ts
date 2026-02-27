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
      await this.authenticate()
      this.logger.log('Keycloak Admin Client authenticated')
    } catch (error) {
      this.logger.error('Failed to authenticate with Keycloak', error)
    }
  }

  async authenticate() {
    await this._client.auth({
      grantType: 'client_credentials',
      clientId: this.configService.keycloakClientId!,
      clientSecret: this.configService.keycloakClientSecret!,
    })
  }

  // TODO: May return undefined if group not found in the most recent search
  async getGroupByName(name: string): Promise<GroupRepresentation | undefined> {
    const groups = await this._client.groups.find({ search: name })
    return groups.find(g => g.name === name)
  }

  async deleteGroup(id: string): Promise<void> {
    await this._client.groups.del({ id })
  }

  async listGroupMembers(groupId: string) {
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

  // Advanced Group Logic
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

  async getOrCreateChildGroup(parentId: string, name: string) {
    for await (const subgroup of this.getSubgroups(parentId)) {
      if (subgroup.name === name) return subgroup
    }
    const createdGroup = await this._client.groups.createChildGroup({ id: parentId }, { name })
    return { id: createdGroup.id } satisfies GroupRepresentation
  }

  async getOrCreateGroup(name: string) {
    const existingGroup = await this.getGroupByName(name)
    if (existingGroup) return existingGroup
    const createdGroup = await this.createGroup(name)
    return { id: createdGroup.id } satisfies GroupRepresentation
  }

  async *getGroups() {
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
