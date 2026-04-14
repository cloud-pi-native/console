import type { Resource as AlchemyResource, Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { CommitAction } from './types.js'
import { Resource } from 'alchemy'

function getGitlabHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined
  const cause = (error as Error & { cause?: unknown }).cause
  if (!cause || typeof cause !== 'object') return undefined
  const status = (cause as { response?: { status?: unknown } }).response?.status
  return typeof status === 'number' ? status : undefined
}

export interface GitlabEnsureFilesProps {
  client: GitlabClient
  projectId: number
  branch: string
  commitMessage: string
  files: Array<{ path: string, content: string, executable: boolean }>
}

export interface GitlabEnsureFilesState {
  projectId: number
  ensuredPaths: string[]
}

export type GitlabEnsureFilesOutput = AlchemyResource<'gitlab:EnsureFiles'> & GitlabEnsureFilesState

export const GitlabEnsureFiles = Resource('gitlab:EnsureFiles', async function (
  this: Context<GitlabEnsureFilesOutput, GitlabEnsureFilesProps>,
  _id: string,
  props: GitlabEnsureFilesProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  const actions: CommitAction[] = []
  for (const file of props.files) {
    try {
      await props.client.repositoryFilesShow(props.projectId, file.path, props.branch)
    } catch (err) {
      if (getGitlabHttpStatus(err) === 404) {
        actions.push({
          action: 'create',
          file_path: file.path,
          content: file.content,
          execute_filemode: file.executable,
        })
      } else {
        throw err
      }
    }
  }

  if (actions.length) {
    await props.client.commitsCreate(props.projectId, props.branch, props.commitMessage, actions)
  }

  return this.create({ projectId: props.projectId, ensuredPaths: props.files.map(f => f.path) })
})
