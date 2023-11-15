import * as fs from 'node:fs/promises'
import path from 'node:path'
import { api } from './utils.js'
import { getGroupId } from './group.js'
import { AccessTokenSchema, ProjectSchema } from '@gitbeaker/rest'

export const createProject = async (
  { groupId, internalRepoName, externalRepoUrn, externalUserName, externalToken, isPrivate }:
  { groupId: number, internalRepoName: string, externalRepoUrn: string, externalUserName: string, externalToken: string, isPrivate: boolean }): Promise<ProjectSchema> => {
  const searchResults = await api.Projects.search(internalRepoName)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.namespace.id === groupId && project.name === internalRepoName)
    if (existingProject) return existingProject
  }
  const externalRepoUrl = isPrivate
    ? `https://${externalUserName}:${externalToken}@${externalRepoUrn}`
    : `https://${externalRepoUrn}`

  return api.Projects.create(
    {
      name: internalRepoName,
      namespaceId: groupId,
      ciConfigPath: '.gitlab-ci-dso.yml',
      importUrl: externalRepoUrl,
    },
  )
}

/**
 * @param {string} internalRepoName - nom du dépôt.
 * @param {string} group - nom du projet DSO.
 * @param {string} organization - nom de l'organisation DSO.
 */
export const createProjectMirror = async (internalRepoName: string, group: string, organization: string): Promise<ProjectSchema> => {
  const groupId = await getGroupId(group, organization)
  if (!groupId) throw Error('Impossible de retrouver le namespace')
  const searchResults = await api.Projects.search(internalRepoName)
  if (searchResults.length) {
    const existingProject = searchResults.find(project => project.namespace.id === groupId && project.name === internalRepoName)
    if (existingProject) return existingProject
  }
  const project = await api.Projects.create(
    {
      name: internalRepoName,
      namespaceId: groupId,
    },
  )
  await api.Commits.create(project.id, 'main', 'ci: :construction_worker: first mirror', mirrorFirstActions)
  return project
}

export const createGroupToken = async (groupId: number, name: string): Promise<AccessTokenSchema> => api.GroupAccessTokens.create(
  groupId,
  name,
  [
    'write_repository',
    'read_repository',
  ],
  {
    expiresAt: '',
  },
)

export const deleteProject = async (internalRepoName: string, group: string, organization: string) => {
  const groupId = await getGroupId(group, organization)
  const searchResult = await api.Projects.search(internalRepoName)
  if (!searchResult.length) return
  const existingProject = searchResult
    .find(project => project.name === internalRepoName && project.namespace.id === groupId)
  if (!existingProject) return
  return api.Projects.remove(existingProject.id)
}

const gitlabCiYml = (await fs.readFile(path.resolve('src/plugins/core/gitlab/files/.gitlab-ci.yml'))).toString()
const mirrorSh = (await fs.readFile(path.resolve('src/plugins/core/gitlab/files/mirror.sh'))).toString()

interface CommitAction {
  /** The action to perform */
  action: 'create' | 'delete' | 'move' | 'update' | 'chmod';
  /** Full path to the file. Ex. lib/class.rb */
  filePath: string;
  /** Original full path to the file being moved.Ex.lib / class1.rb */
  previousPath?: string;
  /** File content, required for all except delete. Optional for move */
  content?: string;
  /** text or base64. text is default. */
  encoding?: string;
  /** Last known file commit id. Will be only considered in update, move and delete actions. */
  lastCommitId?: string;
  /** When true/false enables/disables the execute flag on the file. Only considered for chmod action. */
  execute_filemode?: boolean;
}

const mirrorFirstActions: CommitAction[] = [
  {
    action: 'create',
    filePath: '.gitlab-ci.yml',
    content: gitlabCiYml,
    execute_filemode: false,
  },
  {
    action: 'create',
    filePath: 'mirror.sh',
    content: mirrorSh,
    execute_filemode: true,
  },
]
