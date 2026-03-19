import type { VaultSecret } from './vault-client.service'
import { Inject, Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { VaultClientService, VaultError } from './vault-client.service'
import { generateProjectPath } from './vault.utils'

@Injectable()
export class VaultService {
  constructor(
    @Inject(VaultClientService) private readonly client: VaultClientService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
  }

  @StartActiveSpan()
  async read(path: string): Promise<VaultSecret> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', this.config.vaultKvName)
    span?.setAttribute('vault.kv.path', path)
    return await this.client.getKvData(this.config.vaultKvName, path)
  }

  @StartActiveSpan()
  async write(data: any, path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', this.config.vaultKvName)
    span?.setAttribute('vault.kv.path', path)
    await this.client.upsertKvData(this.config.vaultKvName, path, { data })
  }

  @StartActiveSpan()
  async delete(path: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', this.config.vaultKvName)
    span?.setAttribute('vault.kv.path', path)
    await this.client.delete(path)
  }

  @StartActiveSpan()
  async readProjectValues(projectId: string): Promise<Record<string, any>> {
    const path = generateProjectPath(this.config.projectRootPath, projectId)
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', this.config.vaultKvName)
    span?.setAttribute('vault.kv.path', path)
    const secret = await this.client.getKvData(this.config.vaultKvName, path)
      .catch((error) => {
        if (error instanceof VaultError && error.kind === 'NotFound') return null
        throw error
      })
    return secret?.data
  }

  @StartActiveSpan()
  async readGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.kv.name': this.config.vaultKvName,
      'vault.kv.path': vaultCredsPath,
      'project.slug': projectSlug,
      'repo.name': repoName,
    })
    return await this.read(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeGitlabMirrorCreds(projectSlug: string, repoName: string, data: Record<string, any>) {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.kv.name': this.config.vaultKvName,
      'vault.kv.path': vaultCredsPath,
      'project.slug': projectSlug,
      'repo.name': repoName,
    })
    await this.write(data, vaultCredsPath)
  }

  @StartActiveSpan()
  async deleteGitlabMirrorCreds(projectSlug: string, repoName: string) {
    const vaultCredsPath = generateGitlabMirrorCredPath(this.config.projectRootPath, projectSlug, repoName)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.kv.name': this.config.vaultKvName,
      'vault.kv.path': vaultCredsPath,
      'project.slug': projectSlug,
      'repo.name': repoName,
    })
    await this.delete(vaultCredsPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return
      throw error
    })
  }

  @StartActiveSpan()
  async readTechnReadOnlyCreds(projectSlug: string) {
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootPath, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.kv.name': this.config.vaultKvName,
      'vault.kv.path': vaultPath,
      'project.slug': projectSlug,
    })
    return await this.read(vaultPath).catch((error) => {
      if (error instanceof VaultError && error.kind === 'NotFound') return null
      throw error
    })
  }

  @StartActiveSpan()
  async writeTechReadOnlyCreds(projectSlug: string, creds: Record<string, any>) {
    const vaultPath = generateTechReadOnlyCredPath(this.config.projectRootPath, projectSlug)
    const span = trace.getActiveSpan()
    span?.setAttributes({
      'vault.kv.name': this.config.vaultKvName,
      'vault.kv.path': vaultPath,
      'project.slug': projectSlug,
    })
    await this.write(creds, vaultPath)
  }

  @StartActiveSpan()
  async writeMirrorTriggerToken(secret: Record<string, any>) {
    const span = trace.getActiveSpan()
    span?.setAttribute('vault.kv.name', this.config.vaultKvName)
    span?.setAttribute('vault.kv.path', 'GITLAB')
    await this.write(secret, 'GITLAB')
  }
}

function generateGitlabMirrorCredPath(projectRootPath: string | undefined, projectSlug: string, repoName: string) {
  return projectRootPath
    ? `${generateProjectPath(projectRootPath, projectSlug)}/${repoName}-mirror`
    : `${projectSlug}/${repoName}-mirror`
}

function generateTechReadOnlyCredPath(projectRootPath: string | undefined, projectSlug: string) {
  return projectRootPath
    ? `${generateProjectPath(projectRootPath, projectSlug)}/tech/GITLAB_MIRROR`
    : `${projectSlug}/tech/GITLAB_MIRROR`
}
