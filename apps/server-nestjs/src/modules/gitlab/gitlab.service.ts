import { Injectable } from '@nestjs/common'
import type { GitlabProjectApi } from '@cpn-console/gitlab-plugin/types/class.js'

@Injectable()
export class GitlabService {
  getProjectApi(_projectId: string): Promise<GitlabProjectApi> {
    throw new Error('Method not implemented.')
  }

  getPublicGroupUrl(): Promise<string> {
    throw new Error('Method not implemented.')
  }

  getOrCreateInfraProject(_zoneSlug: string): Promise<{ id: number, http_url_to_repo: string }> {
    throw new Error('Method not implemented.')
  }

  getProjectById(_repoId: number): Promise<{ http_url_to_repo: string }> {
    throw new Error('Method not implemented.')
  }

  getPublicRepoUrl(_internalRepoName: string): Promise<string> {
    throw new Error('Method not implemented.')
  }

  commitCreateOrUpdate(_repoId: number, _content: string, _path: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  commitDelete(_repoId: number, _paths: string[]): Promise<void> {
    throw new Error('Method not implemented.')
  }

  listFiles(_repoId: number, _options: { path: string, recursive: boolean }): Promise<Array<{ name: string, path: string, type: string }>> {
    throw new Error('Method not implemented.')
  }
}
