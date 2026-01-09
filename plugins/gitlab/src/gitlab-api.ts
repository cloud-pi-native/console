import { createHash } from 'node:crypto'
import { PluginApi } from '@cpn-console/hooks'
import type { CommitAction } from '@gitbeaker/rest'
import type { AllRepositoryTreesOptions, CondensedProjectSchema, Gitlab, PaginationRequestOptions, RepositoryFileExpandedSchema, RepositoryTreeSchema } from '@gitbeaker/core'
import { objectEntries } from '@cpn-console/shared'
import type { GitbeakerRequestError } from '@gitbeaker/requester-utils'
import { getApi } from './utils.js'

export interface GitlabMirrorSecret {
  MIRROR_USER: string
  MIRROR_TOKEN: string
}

export interface RepoSelect {
  mirror?: CondensedProjectSchema
  target?: CondensedProjectSchema
}
type PendingCommits = Record<number, {
  branches: Record<string, { messages: string[], actions: CommitAction[] } >
}>

export interface CreateEmptyRepositoryArgs {
  repoName: string
  description?: string
}

/** Abstract class providing functions to interact with Gitlab API */
export abstract class GitlabApi extends PluginApi {
  protected api: Gitlab<false>
  private pendingCommits: PendingCommits = {}

  constructor() {
    super()
    this.api = getApi()
  }

  public async createEmptyRepository({ createFirstCommit, groupId, repoName, description }: CreateEmptyRepositoryArgs & {
    createFirstCommit: boolean
    groupId: number
  }) {
    const project = await this.api.Projects.create({
      name: repoName,
      path: repoName,
      namespaceId: groupId,
      description,
    })
    // Dépôt tout juste créé, zéro branche => pas d'erreur (filesTree undefined)
    if (createFirstCommit) {
      await this.api.Commits.create(project.id, 'main', 'ci: 🌱 First commit', [])
    }
    return project
  }

  public async commitCreateOrUpdate(
    repoId: number,
    fileContent: string,
    filePath: string,
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Update file content',
  ): Promise<boolean> {
    let action: CommitAction['action'] = 'create'

    const branches = await this.api.Branches.all(repoId)
    if (branches.some(b => b.name === branch)) {
      let actualFile: RepositoryFileExpandedSchema | undefined
      try {
        actualFile = await this.api.RepositoryFiles.show(repoId, filePath, branch)
      } catch (_) {}
      if (actualFile) {
        const newContentDigest = createHash('sha256').update(fileContent).digest('hex')
        if (actualFile.content_sha256 === newContentDigest) {
          // Already up-to-date
          return false
        }
        // Update needed
        action = 'update'
      }
    }

    const commitAction: CommitAction = {
      action,
      filePath,
      content: fileContent,
    }
    this.addActions(repoId, branch, comment, [commitAction])

    return true
  }

  /**
   * Fonction pour supprimer une liste de fichiers d'un repo
   * @param repoId
   * @param files
   * @param branch
   * @param comment
   */
  public async commitDelete(
    repoId: number,
    files: string[],
    branch: string = 'main',
    comment: string = 'ci: :robot_face: Delete files',
  ): Promise<boolean> {
    if (files.length) {
      const commitActions: CommitAction[] = files.map((filePath) => {
        return {
          action: 'delete',
          filePath,
        }
      })
      this.addActions(repoId, branch, comment, commitActions)
      return true
    }
    return false
  }

  private addActions(repoId: number, branch: string, comment: string, commitActions: CommitAction[]) {
    if (!this.pendingCommits[repoId]) {
      this.pendingCommits[repoId] = { branches: {} }
    }
    if (this.pendingCommits[repoId].branches[branch]) {
      this.pendingCommits[repoId].branches[branch].actions.push(...commitActions)
      this.pendingCommits[repoId].branches[branch].messages.push(comment)
    } else {
      this.pendingCommits[repoId].branches[branch] = {
        actions: commitActions,
        messages: [comment],
      }
    }
  }

  public async commitFiles() {
    let filesUpdated: number = 0
    for (const [id, repo] of objectEntries(this.pendingCommits)) {
      for (const [branch, details] of objectEntries(repo.branches)) {
        const filesNumber = details.actions.length
        if (filesNumber) {
          filesUpdated += filesNumber
          const message = [`ci: :robot_face: Update ${filesNumber} file${filesNumber > 1 ? 's' : ''}`, ...details.messages.filter(m => m)].join('\n')
          await this.api.Commits.create(id, branch, message, details.actions)
        }
      }
    }
    return filesUpdated
  }

  public async listFiles(repoId: number, options: AllRepositoryTreesOptions & PaginationRequestOptions<'keyset'> = {}) {
    options.path = options?.path ?? '/'
    options.ref = options?.ref ?? 'main'
    options.recursive = options?.recursive ?? false
    try {
      const files: RepositoryTreeSchema[] = await this.api.Repositories.allRepositoryTrees(repoId, options)
      return files
    } catch (error) {
      const { cause } = error as GitbeakerRequestError
      if (cause?.description.includes('Not Found')) {
        // Empty repository, with zero commit ==> Zero files
        return []
      } else {
        throw error
      }
    }
  }

  public async deleteRepository(repoId: number, fullPath: string) {
    await this.api.Projects.remove(repoId) // Marks for deletion
    return this.api.Projects.remove(repoId, { permanentlyRemove: true, fullPath: `${fullPath}-deletion_scheduled-${repoId}` }) // Effective deletion
  }
}
