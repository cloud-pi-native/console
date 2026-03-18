import { Inject, Injectable } from '@nestjs/common'
import type {
  AccessTokenScopes,
  CommitAction,
  MemberSchema,
  PipelineTriggerTokenSchema,
  ProjectSchema,
  RepositoryFileExpandedSchema,
} from '@gitbeaker/core'
import { GitlabClientService } from './gitlab-client.service'

@Injectable()
export class GitlabService {
  constructor(
    @Inject(GitlabClientService) private readonly client: GitlabClientService,
  ) {
  }

  async getOrCreateInfraGroupRepo(path: string) {
    return this.client.getOrCreateInfraGroupRepo(path)
  }

  async getOrCreateProjectSubGroup(subGroupPath: string) {
    return this.client.getOrCreateProjectSubGroup(subGroupPath)
  }

  async getProjectGroupInternalRepoUrl(subGroupPath: string, repoName: string): Promise<string> {
    return this.client.getProjectGroupInternalRepoUrl(subGroupPath, repoName)
  }

  async getOrCreateProjectGroupRepo(subGroupPath: string) {
    return this.client.getOrCreateProjectGroupRepo(subGroupPath)
  }

  async upsertProjectGroupRepo(projectSlug: string, repoName: string, description?: string) {
    return this.client.upsertProjectGroupRepo(projectSlug, repoName, description)
  }

  async deleteProjectGroupRepo(projectSlug: string, repoName: string) {
    return this.client.deleteProjectGroupRepo(projectSlug, repoName)
  }

  async upsertProjectMirrorRepo(projectSlug: string) {
    return this.client.upsertProjectMirrorRepo(projectSlug)
  }

  async commitMirror(repoId: number) {
    return this.client.commitMirror(repoId)
  }

  async getOrCreateMirrorPipelineTriggerToken(projectSlug: string): Promise<PipelineTriggerTokenSchema> {
    return this.client.getOrCreateMirrorPipelineTriggerToken(projectSlug)
  }

  async maybeCommitActions(
    repoId: number,
    actions: CommitAction[],
    message: string,
    ref: string = 'main',
  ): Promise<void> {
    return this.client.maybeCommitActions(repoId, actions, message, ref)
  }

  async maybeCommitUpdate(
    repoId: number,
    files: { content: string, filePath: string }[],
    message: string = 'ci: :robot_face: Update file content',
    ref: string = 'main',
  ): Promise<void> {
    return this.client.maybeCommitUpdate(repoId, files, message, ref)
  }

  async generateCreateOrUpdateAction(repoId: number, ref: string, filePath: string, content: string) {
    return this.client.generateCreateOrUpdateAction(repoId, ref, filePath, content)
  }

  async getFile(repoId: number, filePath: string, ref: string = 'main'): Promise<RepositoryFileExpandedSchema | undefined> {
    return this.client.getFile(repoId, filePath, ref)
  }

  async listFiles(repoId: number, options: { path?: string, recursive?: boolean, ref?: string } = {}) {
    return this.client.listFiles(repoId, options)
  }

  async getGroupMembers(groupId: number): Promise<MemberSchema[]> {
    return this.client.getGroupMembers(groupId) as any
  }

  async addGroupMember(groupId: number, userId: number, accessLevel: number) {
    return this.client.addGroupMember(groupId, userId, accessLevel)
  }

  async editGroupMember(groupId: number, userId: number, accessLevel: number) {
    return this.client.editGroupMember(groupId, userId, accessLevel)
  }

  async removeGroupMember(groupId: number, userId: number) {
    return this.client.removeGroupMember(groupId, userId)
  }

  async getUserByEmail(email: string) {
    return this.client.getUserByEmail(email)
  }

  async createUser(email: string, username: string, name: string) {
    return this.client.createUser(email, username, name)
  }

  getRepos(projectSlug: string): AsyncGenerator<ProjectSchema> {
    return this.client.getRepos(projectSlug) as any
  }

  async getProjectToken(projectSlug: string) {
    return this.client.getProjectToken(projectSlug)
  }

  async createProjectToken(projectSlug: string, tokenName: string, scopes: AccessTokenScopes[]) {
    return this.client.createProjectToken(projectSlug, tokenName, scopes)
  }

  async createMirrorAccessToken(projectSlug: string) {
    return this.client.createMirrorAccessToken(projectSlug)
  }

  async deleteGroup(groupId: number): Promise<void> {
    return this.client.deleteGroup(groupId)
  }

  async getProjectGroupPublicUrl(): Promise<string> {
    return this.client.getProjectGroupPublicUrl()
  }

  async getInfraGroupRepoPublicUrl(repoName: string): Promise<string> {
    return this.client.getInfraGroupRepoPublicUrl(repoName)
  }
}
