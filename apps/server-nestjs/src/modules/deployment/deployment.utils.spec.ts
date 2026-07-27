import type {
  CreateDeployment,
  CreateDeploymentSource,
  CreateDeploymentValueSource,
  UpdateDeployment,
  UpdateDeploymentSource,
  UpdateDeploymentValueSource,
} from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { makeDeploymentExternalValueSource, makeDeploymentInternalValueSource, makeDeploymentSource, makeDeploymentWithRelations } from './deployment-testing.utils'
import {
  buildDeploymentSourceCreate,
  buildDeploymentSourceUpdate,
  parseCreateDeployment,
  parseUpdateDeployment,
  serializeDeployment,
} from './deployment.utils'

const repositoryId = faker.string.uuid()
const externalRepositoryId = faker.string.uuid()
const sourceId = faker.string.uuid()
const internalId = faker.string.uuid()

// Common top-level fields; tests only care about the deploymentSources they pass.
function makeCreateDeployment(deploymentSources: CreateDeploymentSource[]): CreateDeployment {
  return {
    name: 'mydeployment',
    projectId: faker.string.uuid(),
    environmentId: faker.string.uuid(),
    autosync: true,
    deploymentSources,
  }
}

function makeUpdateDeployment(deploymentSources: UpdateDeploymentSource[]): UpdateDeployment {
  return { ...makeCreateDeployment([]), deploymentSources }
}

function updateSourceWith(valueSources: UpdateDeploymentValueSource[]) {
  const deployment = makeUpdateDeployment([
    {
      id: sourceId,
      type: 'git',
      repositoryId,
      targetRevision: 'develop',
      path: '/x',
      helmValuesFiles: '',
      valueSources,
    },
  ])
  return parseUpdateDeployment(deployment).deploymentSourcesToUpdate[0]
}

const internalValueSource = { type: 'internal', path: 'a.yaml' } satisfies CreateDeploymentValueSource
const externalValueSource = {
  type: 'external',
  path: 'ext.yaml',
  ref: 'infra',
  targetRevision: 'main',
  repositoryId: externalRepositoryId,
} satisfies CreateDeploymentValueSource

describe('deploymentUtils', () => {
  describe('parseCreateDeployment', () => {
    it('should carry the top-level fields (dropping projectId, which the service connects itself)', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, valueSources: [] }])

      const model = parseCreateDeployment(deployment)

      expect(model).toMatchObject({ name: deployment.name, autosync: deployment.autosync, environmentId: deployment.environmentId })
      expect(model).not.toHaveProperty('projectId')
    })

    it('should partition value sources into internal list and single external, preserving list order', () => {
      const deployment = makeCreateDeployment([
        {
          type: 'git',
          repositoryId,
          targetRevision: 'main',
          path: '/app',
          helmValuesFiles: 'values.yaml',
          valueSources: [
            { type: 'internal', path: 'a.yaml' },
            externalValueSource,
            { type: 'internal', path: 'b.yaml' },
          ],
        },
      ])

      const { valueSources } = parseCreateDeployment(deployment).deploymentSources[0]

      // `order` is the position in the original list, so the interleaving survives.
      expect(valueSources.internal).toEqual([
        { path: 'a.yaml', order: 0 },
        { path: 'b.yaml', order: 2 },
      ])
      expect(valueSources.external).toEqual({
        path: 'ext.yaml',
        ref: 'infra',
        targetRevision: 'main',
        repositoryId: externalRepositoryId,
        order: 1,
      })
    })

    it('should leave external undefined when no external value source is provided', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, valueSources: [internalValueSource] }])

      const { valueSources } = parseCreateDeployment(deployment).deploymentSources[0]

      expect(valueSources.internal).toEqual([{ path: 'a.yaml', order: 0 }])
      expect(valueSources).not.toHaveProperty('external')
    })
  })

  describe('parseUpdateDeployment', () => {
    it('should split deployment sources into create (no id) and update (id) buckets', () => {
      const deployment = makeUpdateDeployment([
        { id: sourceId, type: 'git', repositoryId, valueSources: [] },
        { type: 'oci', repositoryId, valueSources: [] },
      ])

      const model = parseUpdateDeployment(deployment)

      expect(model.deploymentSourcesToUpdate).toHaveLength(1)
      expect(model.deploymentSourcesToUpdate[0]).toMatchObject({ id: sourceId, type: 'git' })
      expect(model.deploymentSourcesToCreate).toHaveLength(1)
      expect(model.deploymentSourcesToCreate[0]).toMatchObject({ type: 'oci' })
      expect(model.deploymentSourcesToCreate[0]).not.toHaveProperty('id')
    })

    it('should split internal value sources by id and preserve order across the interleaved external', () => {
      const deployment = makeUpdateDeployment([
        { id: sourceId, type: 'git', repositoryId, valueSources: [
          { type: 'internal', id: internalId, path: 'kept.yaml' },
          { type: 'internal', path: 'new.yaml' },
          externalValueSource,
        ] },
      ])

      const { valueSources } = parseUpdateDeployment(deployment).deploymentSourcesToUpdate[0]

      expect(valueSources.internalToUpdate).toEqual([{ id: internalId, path: 'kept.yaml', order: 0 }])
      expect(valueSources.internalToCreate).toEqual([{ path: 'new.yaml', order: 1 }])
      expect(valueSources.external).toEqual({
        path: 'ext.yaml',
        ref: 'infra',
        targetRevision: 'main',
        repositoryId: externalRepositoryId,
        order: 2,
      })
    })

    it('should parse the value sources of a new (no id) deployment source as fresh creates', () => {
      const deployment = makeUpdateDeployment([{ type: 'git', repositoryId, valueSources: [internalValueSource] }])

      const { valueSources } = parseUpdateDeployment(deployment).deploymentSourcesToCreate[0]

      expect(valueSources.internal).toEqual([{ path: 'a.yaml', order: 0 }])
    })
  })

  describe('buildDeploymentSourceCreate', () => {
    it('should build the nested create write with internal and external value sources', () => {
      const deployment = makeCreateDeployment([
        {
          type: 'git',
          repositoryId,
          targetRevision: 'main',
          path: '/app',
          helmValuesFiles: 'values.yaml',
          valueSources: [internalValueSource, externalValueSource],
        },
      ])

      const source = parseCreateDeployment(deployment).deploymentSources[0]

      expect(buildDeploymentSourceCreate(source)).toEqual({
        type: 'git',
        repository: { connect: { id: repositoryId } },
        targetRevision: 'main',
        path: '/app',
        helmValuesFiles: 'values.yaml',
        internalValueSources: { create: [{ path: 'a.yaml', order: 0 }] },
        externalValueSource: {
          create: {
            order: 1,
            path: 'ext.yaml',
            ref: 'infra',
            targetRevision: 'main',
            repository: { connect: { id: externalRepositoryId } },
          },
        },
      })
    })

    it('should omit externalValueSource entirely when there is none', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, valueSources: [internalValueSource] }])

      const result = buildDeploymentSourceCreate(parseCreateDeployment(deployment).deploymentSources[0])

      expect(result.internalValueSources).toEqual({ create: [{ path: 'a.yaml', order: 0 }] })
      expect(result).not.toHaveProperty('externalValueSource')
    })
  })

  describe('buildDeploymentSourceUpdate', () => {
    it('should create/update internal sources by id and delete the ones no longer sent', () => {
      const source = updateSourceWith([
        { type: 'internal', id: internalId, path: 'kept.yaml' },
        { type: 'internal', path: 'new.yaml' },
      ])

      expect(buildDeploymentSourceUpdate(source, false).internalValueSources).toEqual({
        deleteMany: { id: { notIn: [internalId] } },
        create: [{ path: 'new.yaml', order: 1 }],
        update: [
          {
            where: { id: internalId },
            data: { path: 'kept.yaml', order: 0 },
          },
        ],
      })
    })

    it('should upsert the external value source when present', () => {
      const source = updateSourceWith([externalValueSource])
      const externalWrite = {
        order: 0,
        path: 'ext.yaml',
        ref: 'infra',
        targetRevision: 'main',
        repository: { connect: { id: externalRepositoryId } },
      }

      expect(buildDeploymentSourceUpdate(source, false).externalValueSource).toEqual({ upsert: { update: externalWrite, create: externalWrite } })
    })

    it('should delete the external value source when it was removed and one existed', () => {
      const source = updateSourceWith([internalValueSource])

      expect(buildDeploymentSourceUpdate(source, true).externalValueSource).toEqual({ delete: true })
    })

    it('should leave the external value source untouched when none existed and none was sent', () => {
      const source = updateSourceWith([internalValueSource])

      expect(buildDeploymentSourceUpdate(source, false).externalValueSource).toEqual({})
    })
  })

  describe('serializeDeployment', () => {
    it('should merge the two value source relations into one list ordered by `order`', () => {
      const internalA = makeDeploymentInternalValueSource({ order: 0, path: 'a.yaml' })
      const internalB = makeDeploymentInternalValueSource({ order: 2, path: 'b.yaml' })
      const external = makeDeploymentExternalValueSource({
        order: 1,
        path: 'ext.yaml',
        ref: 'infra',
        targetRevision: 'main',
        repositoryId: externalRepositoryId,
      })
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({
          internalValueSources: [internalA, internalB],
          externalValueSource: external,
        })],
      })

      const [source] = serializeDeployment(deployment).deploymentSources

      expect(source.valueSources).toEqual([
        { type: 'internal', id: internalA.id, order: 0, path: 'a.yaml' },
        {
          type: 'external',
          id: external.id,
          order: 1,
          path: 'ext.yaml',
          ref: 'infra',
          targetRevision: 'main',
          repositoryId: externalRepositoryId,
        },
        { type: 'internal', id: internalB.id, order: 2, path: 'b.yaml' },
      ])
    })

    it('should drop the persisted relations from the serialized source', () => {
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({
          internalValueSources: [makeDeploymentInternalValueSource()],
          externalValueSource: null,
        })],
      })

      const [source] = serializeDeployment(deployment).deploymentSources

      expect(source).not.toHaveProperty('internalValueSources')
      expect(source).not.toHaveProperty('externalValueSource')
    })

    it('should yield an empty list when a source has no value sources', () => {
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({ internalValueSources: [], externalValueSource: null })],
      })

      expect(serializeDeployment(deployment).deploymentSources[0].valueSources).toEqual([])
    })
  })
})
