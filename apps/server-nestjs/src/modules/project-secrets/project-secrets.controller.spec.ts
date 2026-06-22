import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectSecretsService } from './project-secrets.service.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectSecretsController } from './project-secrets.controller.js'

describe('projectSecretsController', () => {
  let controller: ProjectSecretsController
  let projectSecretsService: DeepMockProxy<ProjectSecretsService>

  beforeEach(() => {
    projectSecretsService = mockDeep<ProjectSecretsService>()
    controller = new ProjectSecretsController(projectSecretsService as ProjectSecretsService)
  })

  it('getSecrets delegates to the service', async () => {
    projectSecretsService.getSecrets.mockResolvedValue({})

    await controller.getSecrets({ id: 'project-id' })

    expect(projectSecretsService.getSecrets).toHaveBeenCalledWith('project-id')
  })
})
