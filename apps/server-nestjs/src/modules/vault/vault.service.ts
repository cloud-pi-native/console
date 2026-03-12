import { Inject, Injectable } from '@nestjs/common'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import type { VaultResult, VaultSecret } from './vault-client.service'
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('vault-service')

@Injectable()
export class VaultService {
  constructor(
    @Inject(VaultClientService) private readonly vaultClientService: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  async destroy(path: string): Promise<VaultResult<void>> {
    return tracer.startActiveSpan('destroy', async (span) => {
      try {
        span.setAttribute('vault.path', path)
        return await this.vaultClientService.destroy(path)
      } finally {
        span.end()
      }
    })
  }

  async readProjectValues(projectId: string): Promise<VaultResult<Record<string, any>>> {
    return tracer.startActiveSpan('readProjectValues', async (span) => {
      const path = this.config.projectRootPath
        ? `${this.config.projectRootPath}/${projectId}`
        : projectId
      try {
        span.setAttribute('vault.path', path)
        const secret = await this.vaultClientService.read(path)
        if (secret.error) {
          if (secret.error.kind === 'NotFound') return { data: {}, error: null }
          return { data: null, error: secret.error }
        }
        return { data: secret.data.data || {}, error: null }
      } finally {
        span.end()
      }
    })
  }

  async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    return tracer.startActiveSpan('readGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        return await this.read(vaultCredsPath)
      } finally {
        span.end()
      }
    })
  }

  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    return tracer.startActiveSpan('writeGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        return await this.write(data, vaultCredsPath)
      } finally {
        span.end()
      }
    })
  }

  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    return tracer.startActiveSpan('deleteGitlabMirrorCreds', async (span) => {
      const vaultCredsPath = `${this.config.projectRootPath}/${projectSlug}/${repoName}-mirror`
      try {
        span.setAttribute('vault.path', vaultCredsPath)
        span.setAttribute('project.slug', projectSlug)
        span.setAttribute('repo.name', repoName)
        const result = await this.destroy(vaultCredsPath)
        if (result.error?.kind === 'NotFound') return { data: undefined, error: null }
        return result
      } finally {
        span.end()
      }
    })
  }

  async readMirrorCreds(projectSlug: string) {
    return tracer.startActiveSpan('readMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        return await this.read(vaultPath)
      } finally {
        span.end()
      }
    })
  }

  async writeMirrorCreds(projectSlug: string, creds: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorCreds', async (span) => {
      const vaultPath = `${this.config.projectRootPath}/${projectSlug}/tech/GITLAB_MIRROR`
      try {
        span.setAttribute('vault.path', vaultPath)
        span.setAttribute('project.slug', projectSlug)
        return await this.write(creds, vaultPath)
      } finally {
        span.end()
      }
    })
  }

  async writeMirrorTriggerToken(secret: Record<string, any>) {
    return tracer.startActiveSpan('writeMirrorTriggerToken', async (span) => {
      try {
        span.setAttribute('vault.path', 'GITLAB')
        return await this.write(secret, 'GITLAB')
      } finally {
        span.end()
      }
    })
  }
}
