import type { CreateRepository, SyncRepository, UpdateRepository } from '@cpn-console/shared'
import type { Repository } from '@prisma/client'
import type { EventLogAction, RepositorySyncEventPayload } from '../events/app-events.service'
import type { PluginResults } from '../plugin/plugin.utils'
import type { RepositoryMirrorCredentialUpdate } from './repository.utils'
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional, UnprocessableEntityException } from '@nestjs/common'
import { AppEventsService } from '../events/app-events.service'
import { getFailedPlugins } from '../plugin/plugin.utils'
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
      // GIT_INPUT_PASSWORD from Vault (it never receives the token), so a token written
      // after the reconcile would never reach the mirror.
      if (this.vault) {
        await this.vault.writeGitlabMirrorCreds(projectSlug, repository.internalRepoName, {
          GIT_INPUT_USER: repositoryToCreate.externalUserName,
          GIT_INPUT_PASSWORD: repositoryToCreate.externalToken,
        })
      } else {
        this.logger.warn(`mirror credentials not stored (repositoryId=${repository.id}): vault not configured`)
      }
    }

    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Create Repository',
      userId,
      requestId,
      'Echec des services lors de la création du dépôt',
    )

    // Legacy parity: a repository declared with an external source is mirrored right
    // away, so the first sync doesn't wait for a manual trigger, and a failed sync
    // surfaces as 422 (business.ts returned Unprocessable422 in v1). The DB row stays
    // committed — the sync is replayable via the dedicated endpoint.
    if (repositoryToCreate.externalRepoUrl) {
      const results = await this.syncRepositoryMirror(
        { projectId, projectSlug, internalRepoName: repository.internalRepoName, syncAllBranches: true },
        userId,
        requestId,
      )
      if (!Object.keys(results).length) {
        this.logger.warn(`repository.sync after creation had no listener (repositoryId=${repository.id}): no sync plugin is enabled`)
      } else if (getFailedPlugins(results).length) {
        throw new UnprocessableEntityException('Echec des services à la synchronisation du dépôt')
      }
    }

    return repository
  }

  /**
   * Triggers the GitLab mirror for one repository and waits for the outcome: unlike the
   * project reconciliation, this is the user's whole intent for the request, so a
   * failing plugin must surface as a 422 rather than a silent log entry.
   */
  async syncRepository(projectId: string, projectSlug: string, repositoryId: string, syncRequest: SyncRepository, userId: string, requestId: string): Promise<void> {
    const repository = await this.getProjectRepositoryOrThrow(projectId, repositoryId)

    const results = await this.syncRepositoryMirror(
      {
        projectId,
        projectSlug,
        internalRepoName: repository.internalRepoName,
        ...(syncRequest.syncAllBranches
          ? { syncAllBranches: true }
          : { syncAllBranches: false, branchName: syncRequest.branchName }),
      },
      userId,
      requestId,
    )

    if (getFailedPlugins(results).length) {
      throw new UnprocessableEntityException('Echec des services à la synchronisation du dépôt')
    }
  }

  private syncRepositoryMirror(payload: RepositorySyncEventPayload, userId: string, requestId: string): Promise<PluginResults> {
    return this.appEvents.emitRepositoryEvent('repository.sync', payload, {
      action: 'Sync Repository',
      userId,
      requestId,
    })
  }

  async updateRepository(projectId: string, projectSlug: string, repositoryId: string, repositoryToUpdate: UpdateRepository, userId: string, requestId: string): Promise<Repository> {
    await this.getProjectRepositoryOrThrow(projectId, repositoryId)

    const repository = await this.repositoryDatastoreService.updateRepository(
      repositoryId,
      buildRepositoryUpdateData(repositoryToUpdate),
    )

    // Apply the credential intent to Vault BEFORE emitting the reconciliation, for the
    // same reason as on create: the token lives nowhere but Vault and the reconciler only
    // preserves the GIT_INPUT_PASSWORD already stored there, so the new token (or its
    // removal) must be persisted first.
    await this.applyMirrorCredentialUpdate(projectSlug, repository, parseRepositoryCredentialUpdate(repositoryToUpdate))

    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Update Repository',
      userId,
      requestId,
      'Echec des services à la mise à jour du dépôt',
    )
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
    await this.reconcileProjectAndThrowOnFailure(
      projectId,
      'Delete Repository',
      userId,
      requestId,
      'Echec des services à la suppression du dépôt',
    )
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
   * Runs the project reconciliation and waits for it before answering: a repository
   * change is only meaningful once the services have applied it, so a failing plugin
   * must surface as a 422 (legacy v1 behavior) instead of leaving the caller with a
   * success on a project that AppEventsService just marked `failed`. The row change
   * stays committed — the reconciliation is replayable.
   */
  private async reconcileProjectAndThrowOnFailure(
    projectId: string,
    action: EventLogAction,
    userId: string,
    requestId: string,
    failureMessage: string,
  ): Promise<void> {
    const results = await this.appEvents.emitProjectEvent('project.upsert', projectId, { action, userId, requestId })

    if (getFailedPlugins(results).length) {
      throw new UnprocessableEntityException(failureMessage)
    }
  }
}
