import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { ProjectSchema } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabProjectProps {
  client: GitlabClient
  name: string
  path: string
  namespaceId: number
  description?: string
  ciConfigPath?: string
}

export type GitlabProjectOutput = Resource<'gitlab:Project'> & ProjectSchema

export const GitlabProject = Resource('gitlab:Project', async function (
  this: Context<GitlabProjectOutput, GitlabProjectProps>,
  _id: string,
  props: GitlabProjectProps,
) {
  if (this.phase === 'create') {
    const projects = await props.client.groupsAllProjects(props.namespaceId, { search: props.name })
    const existing = projects.data.find(p => p.path === props.path)
    if (existing) return this.create(existing)

    const project = await props.client.projectsCreate({
      name: props.name,
      path: props.path,
      namespaceId: props.namespaceId,
      description: props.description,
      ciConfigPath: props.ciConfigPath,
    })
    return this.create(project)
  } else if (this.phase === 'update') {
    return this.create(this.output)
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
