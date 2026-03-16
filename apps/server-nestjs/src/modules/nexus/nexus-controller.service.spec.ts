import { Test } from '@nestjs/testing'
import { describe, beforeEach, it, expect, vi } from 'vitest'
import type { Mocked } from 'vitest'
import { ENABLED } from '@cpn-console/shared'

import { NexusControllerService } from './nexus-controller.service'
import { NexusDatastoreService } from './nexus-datastore.service'
import { NexusService } from './nexus.service'
import { makeProjectWithDetails } from './nexus-testing.utils'

function createNexusControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusControllerService,
      {
        provide: NexusService,
        useValue: {
          provisionProject: vi.fn(),
          deleteProject: vi.fn(),
        } satisfies Partial<NexusService>,
      },
      {
        provide: NexusDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
        } satisfies Partial<NexusDatastoreService>,
      },
    ],
  })
}

describe('nexusControllerService', () => {
  let service: NexusControllerService
  let nexus: Mocked<NexusService>
  let nexusDatastore: Mocked<NexusDatastoreService>

  beforeEach(async () => {
    const moduleRef = await createNexusControllerServiceTestingModule().compile()
    service = moduleRef.get(NexusControllerService)
    nexus = moduleRef.get(NexusService)
    nexusDatastore = moduleRef.get(NexusDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('handleUpsert should provision project with computed flags', async () => {
    const project = makeProjectWithDetails({
      slug: 'project-1',
      owner: { email: 'owner@example.com' },
      plugins: [
        { key: 'activateMavenRepo', value: ENABLED },
        { key: 'activateNpmRepo', value: 'disabled' },
      ],
    })

    await service.handleUpsert(project)

    expect(nexus.provisionProject).toHaveBeenCalledWith({
      projectSlug: 'project-1',
      ownerEmail: 'owner@example.com',
      enableMaven: true,
      enableNpm: false,
      mavenSnapshotWritePolicy: undefined,
      mavenReleaseWritePolicy: undefined,
      npmWritePolicy: undefined,
    })
  })

  it('handleDelete should delete project', async () => {
    const project = makeProjectWithDetails({ slug: 'project-1' })
    await service.handleDelete(project)
    expect(nexus.deleteProject).toHaveBeenCalledWith('project-1')
  })

  it('reconcile should reconcile all projects', async () => {
    const projects = [
      makeProjectWithDetails({ slug: 'project-1', plugins: [{ key: 'activateMavenRepo', value: ENABLED }] }),
      makeProjectWithDetails({ slug: 'project-2', plugins: [{ key: 'activateNpmRepo', value: ENABLED }] }),
    ]

    nexusDatastore.getAllProjects.mockResolvedValue(projects)

    await service.reconcile()

    expect(nexus.provisionProject).toHaveBeenCalledTimes(2)
  })
})
