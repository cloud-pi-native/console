import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import type { Repository } from '@prisma/client'
import type { EventLogAction } from '../events/app-events.service'
import type { RepositoryMirrorCredentialUpdate } from './repository.utils'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { VaultClientService } from '../vault/vault-client.service'
import { RepositoryDatastoreService } from './repository-datastore.service'
import { buildRepositoryCreateData, buildRepositoryUpdateData, parseRepositoryCredentialUpdate } from './repository.utils'

@Injectable()
export class RepositoryService {
  private readonly logger = new Logger(RepositoryService.name)

  constructor(
    @Inject(RepositoryDatastoreService) private readonly repositoryDatastoreService: RepositoryDatastoreService,
    @Inject(AppEventsService) private readonly appEvents: AppEventsService,
    @Inject(VaultClientService) @Optional() private readonly vault?: VaultClientService,
  ) {}

  listByProjectId(projectId: string): Promise<Repository[]> {
    return this.repositoryDatastoreService.getRepositoriesByProjectId(projectId)
  }

  async createRepository(projectId: string, projectSlug: string, repositoryToCreate: CreateRepository, userId: string, requestId: string): Promise<Repository> {
    if (await this.repositoryDatastoreService.hasRepositoryWithName(projectId, repositoryToCreate.internalRepoName)) {
      throw new BadRequestException(`Le nom du dépôt interne ${repositoryToCreate.internalRepoName} existe déjà en base pour ce projet`)
    }

    const repository = await this.repositoryDatastoreService.createRepository(
      buildRepositoryCreateData(projectId, repositoryToCreate),
    )

    if (repositoryToCreate.isPrivate) {
      // The external token is never persisted in the database — it only lives in Vault
      // as the mirror input credentials. We must write it BEFORE emitting the
      // reconciliation: the GitLab reconciler only reads and *preserves* the existing
      // GIT_INPUT_PASSWORD from Vault (it never receives the token), and the reconcile
      // runs fire-and-forget. A token written after — or racing — the reconcile would
      // be lost, since it exists nowhere else once this request returns.
      if (this.vault) {
        await this.vault.writeGitlabMirrorCreds(projectSlug, repository.internalRepoName, {
          GIT_INPUT_USER: repositoryToCreate.externalUserName,
          GIT_INPUT_PASSWORD: repositoryToCreate.externalToken,
        })
      } else {
        this.logger.warn(`mirror credentials not stored (repositoryId=${repository.id}): vault not configured`)
      }
    }

    this.reconcileProject(projectId, 'Create Repository', userId, requestId)
    return repository
  }

  async updateRepository(projectId: string, projectSlug: string, repositoryId: string, repositoryToUpdate: UpdateRepository, userId: string, requestId: string): Promise<Repository> {
    await this.getProjectRepositoryOrThrow(projectId, repositoryId)

    const repository = await this.repositoryDatastoreService.updateRepository(
      repositoryId,
      buildRepositoryUpdateData(repositoryToUpdate),
    )

    // Apply the credential intent to Vault BEFORE emitting the reconciliation, for the
    // same reason as on create: the token lives nowhere but Vault, the reconciler only
    // preserves the GIT_INPUT_PASSWORD already stored there, and the reconcile is
    // fire-and-forget — so the new token (or its removal) must be persisted first.
    await this.applyMirrorCredentialUpdate(projectSlug, repository, parseRepositoryCredentialUpdate(repositoryToUpdate))

    this.reconcileProject(projectId, 'Update Repository', userId, requestId)
    return repository
  }

  private async applyMirrorCredentialUpdate(
    projectSlug: string,
    repository: Repository,
    credentialUpdate: RepositoryMirrorCredentialUpdate,
  ): Promise<void> {
    if (!this.vault) {
      if (credentialUpdate.kind !== 'keep') {
        this.logger.warn(`mirror credentials not ${credentialUpdate.kind === 'set' ? 'stored' : 'cleared'} (repositoryId=${repository.id}): vault not configured`)
      }
      return
    }

    switch (credentialUpdate.kind) {
      case 'set':
        // The mirror username comes from the just-updated row (legacy reads it from the
        // DB, not the request); only the token is ephemeral to this call.
        await this.vault.writeGitlabMirrorCreds(projectSlug, repository.internalRepoName, {
          GIT_INPUT_USER: repository.externalUserName,
          GIT_INPUT_PASSWORD: credentialUpdate.externalToken,
        })
        break
      case 'clear':
        await this.vault.deleteGitlabMirrorCreds(projectSlug, repository.internalRepoName)
        break
      case 'keep':
        break
    }
  }

  async deleteRepository(projectId: string, repositoryId: string, userId: string, requestId: string): Promise<void> {
    await this.getProjectRepositoryOrThrow(projectId, repositoryId)
    await this.repositoryDatastoreService.deleteRepository(repositoryId)
    this.reconcileProject(projectId, 'Delete Repository', userId, requestId)
  }

  /** Ensures the repository exists and belongs to the project addressed in the route. */
  private async getProjectRepositoryOrThrow(projectId: string, repositoryId: string): Promise<Repository> {
    const repository = await this.repositoryDatastoreService.getRepositoryById(repositoryId)
    if (repository.projectId !== projectId) {
      throw new NotFoundException('Dépôt introuvable')
    }
    return repository
  }

  /**
   * Triggers the project reconciliation without blocking the response: listener
   * outcomes (including failures) are persisted in the admin log by AppEventsService.
   */
  private reconcileProject(projectId: string, action: EventLogAction, userId: string, requestId: string): void {
    this.appEvents.emitProjectEvent('project.upsert', projectId, { action, userId, requestId })
      .catch((error: unknown) => {
        this.logger.error(`project.upsert reconciliation failed (projectId=${projectId})`, error instanceof Error ? error.stack : String(error))
      })
  }
}
