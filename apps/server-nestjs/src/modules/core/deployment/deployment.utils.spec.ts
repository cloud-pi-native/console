import type {
  CreateDeployment,
  CreateDeploymentSource,
  UpdateDeployment,
  UpdateDeploymentSource,
  WritableDeploymentExternalValuesRef,
} from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import {
  makeDeploymentExternalValueSource,
  makeDeploymentExternalValuesRef,
  makeDeploymentInternalValueSource,
  makeDeploymentSource,
  makeDeploymentWithRelations,
} from './deployment-testing.utils'
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
const externalId = faker.string.uuid()

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

const sourceFields = {
  id: sourceId,
  type: 'git',
  repositoryId,
  targetRevision: 'develop',
  path: '/x',
  helmValuesFiles: '',
} satisfies Pick<UpdateDeploymentSource, 'id' | 'type' | 'repositoryId' | 'targetRevision' | 'path' | 'helmValuesFiles'>

function parseUpdateSource(source: UpdateDeploymentSource) {
  return parseUpdateDeployment(makeUpdateDeployment([source])).deploymentSourcesToUpdate[0]
}

const externalValuesRef = {
  ref: 'infra',
  targetRevision: 'main',
  repositoryId: externalRepositoryId,
} satisfies WritableDeploymentExternalValuesRef

const externalRefFields = {
  ref: 'infra',
  targetRevision: 'main',
  repository: { connect: { id: externalRepositoryId } },
}

describe('deploymentUtils', () => {
  describe('parseCreateDeployment', () => {
    it('should carry the top-level fields (dropping projectId, which the service connects itself)', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, useExternalValues: false, valueSources: [] }])

      const model = parseCreateDeployment(deployment)

      expect(model).toMatchObject({ name: deployment.name, autosync: deployment.autosync, environmentId: deployment.environmentId })
      expect(model).not.toHaveProperty('projectId')
    })

    it('should nest external value sources under their shared ref, preserving list order', () => {
      const deployment = makeCreateDeployment([
        {
          type: 'git',
          repositoryId,
          targetRevision: 'main',
          path: '/app',
          helmValuesFiles: 'values.yaml',
          useExternalValues: true,
          externalValuesRef,
          valueSources: [
            { type: 'internal', path: 'a.yaml' },
            { type: 'external', path: 'ext.yaml' },
            { type: 'internal', path: 'b.yaml' },
            { type: 'external', path: 'ext-2.yaml' },
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
        ...externalValuesRef,
        files: [
          { path: 'ext.yaml', order: 1 },
          { path: 'ext-2.yaml', order: 3 },
        ],
      })
    })

    it('should keep a ref without external files', () => {
      const deployment = makeCreateDeployment([{
        type: 'git',
        repositoryId,
        useExternalValues: true,
        externalValuesRef,
        valueSources: [{ type: 'internal', path: 'a.yaml' }],
      }])

      const { valueSources } = parseCreateDeployment(deployment).deploymentSources[0]

      expect(valueSources.external).toEqual({ ...externalValuesRef, files: [] })
    })

    it('should leave external undefined when external values are not used', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, useExternalValues: false, valueSources: [{ type: 'internal', path: 'a.yaml' }] }])

      const { valueSources } = parseCreateDeployment(deployment).deploymentSources[0]

      expect(valueSources.internal).toEqual([{ path: 'a.yaml', order: 0 }])
      expect(valueSources).not.toHaveProperty('external')
    })
  })

  describe('parseUpdateDeployment', () => {
    it('should split deployment sources into create (no id) and update (id) buckets', () => {
      const deployment = makeUpdateDeployment([
        { id: sourceId, type: 'git', repositoryId, useExternalValues: false, valueSources: [] },
        { type: 'oci', repositoryId, useExternalValues: false, valueSources: [] },
      ])

      const model = parseUpdateDeployment(deployment)

      expect(model.deploymentSourcesToUpdate).toHaveLength(1)
      expect(model.deploymentSourcesToUpdate[0]).toMatchObject({ id: sourceId, type: 'git' })
      expect(model.deploymentSourcesToCreate).toHaveLength(1)
      expect(model.deploymentSourcesToCreate[0]).toMatchObject({ type: 'oci' })
      expect(model.deploymentSourcesToCreate[0]).not.toHaveProperty('id')
    })

    it('should split internal and external value sources by id and preserve the interleaved order', () => {
      const { valueSources } = parseUpdateSource({
        ...sourceFields,
        useExternalValues: true,
        externalValuesRef,
        valueSources: [
          { type: 'internal', id: internalId, path: 'kept.yaml' },
          { type: 'external', id: externalId, path: 'kept-ext.yaml' },
          { type: 'internal', path: 'new.yaml' },
          { type: 'external', path: 'ext.yaml' },
        ],
      })

      expect(valueSources.internalToUpdate).toEqual([{ id: internalId, path: 'kept.yaml', order: 0 }])
      expect(valueSources.internalToCreate).toEqual([{ path: 'new.yaml', order: 2 }])
      expect(valueSources.external).toEqual({
        ...externalValuesRef,
        filesToUpdate: [{ id: externalId, path: 'kept-ext.yaml', order: 1 }],
        filesToCreate: [{ path: 'ext.yaml', order: 3 }],
      })
    })

    it('should parse the value sources of a new (no id) deployment source as fresh creates, ignoring ids', () => {
      const deployment = makeUpdateDeployment([{
        type: 'git',
        repositoryId,
        useExternalValues: false,
        valueSources: [{ type: 'internal', id: internalId, path: 'a.yaml' }],
      }])

      const { valueSources } = parseUpdateDeployment(deployment).deploymentSourcesToCreate[0]

      expect(valueSources.internal).toEqual([{ path: 'a.yaml', order: 0 }])
    })
  })

  describe('buildDeploymentSourceCreate', () => {
    it('should build the nested create write with internal value sources and the ref owning its files', () => {
      const deployment = makeCreateDeployment([
        {
          type: 'git',
          repositoryId,
          targetRevision: 'main',
          path: '/app',
          helmValuesFiles: 'values.yaml',
          useExternalValues: true,
          externalValuesRef,
          valueSources: [{ type: 'internal', path: 'a.yaml' }, { type: 'external', path: 'ext.yaml' }],
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
        externalValuesRef: {
          create: { ...externalRefFields, valueSources: { create: [{ path: 'ext.yaml', order: 1 }] } },
        },
      })
    })

    it('should omit the external ref entirely when external values are not used', () => {
      const deployment = makeCreateDeployment([{ type: 'git', repositoryId, useExternalValues: false, valueSources: [{ type: 'internal', path: 'a.yaml' }] }])

      const result = buildDeploymentSourceCreate(parseCreateDeployment(deployment).deploymentSources[0])

      expect(result.internalValueSources).toEqual({ create: [{ path: 'a.yaml', order: 0 }] })
      expect(result).not.toHaveProperty('externalValuesRef')
    })
  })

  describe('buildDeploymentSourceUpdate', () => {
    it('should create/update internal sources by id and delete the ones no longer sent', () => {
      const source = parseUpdateSource({
        ...sourceFields,
        useExternalValues: false,
        valueSources: [
          { type: 'internal', id: internalId, path: 'kept.yaml' },
          { type: 'internal', path: 'new.yaml' },
        ],
      })

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

    it('should update a kept ref and reconcile its files by id', () => {
      const source = parseUpdateSource({
        ...sourceFields,
        useExternalValues: true,
        externalValuesRef,
        valueSources: [
          { type: 'external', id: externalId, path: 'kept-ext.yaml' },
          { type: 'external', path: 'ext.yaml' },
        ],
      })

      expect(buildDeploymentSourceUpdate(source, true).externalValuesRef).toEqual({
        update: {
          ...externalRefFields,
          valueSources: {
            deleteMany: { id: { notIn: [externalId] } },
            create: [{ path: 'ext.yaml', order: 1 }],
            update: [{ where: { id: externalId }, data: { path: 'kept-ext.yaml', order: 0 } }],
          },
        },
      })
    })

    it('should create a new ref with all its files, ignoring ids that cannot exist yet', () => {
      const source = parseUpdateSource({
        ...sourceFields,
        useExternalValues: true,
        externalValuesRef,
        valueSources: [
          { type: 'external', path: 'ext.yaml' },
          { type: 'external', id: externalId, path: 'stale-id.yaml' },
        ],
      })

      expect(buildDeploymentSourceUpdate(source, false).externalValuesRef).toEqual({
        create: {
          ...externalRefFields,
          valueSources: { create: [{ path: 'ext.yaml', order: 0 }, { path: 'stale-id.yaml', order: 1 }] },
        },
      })
    })

    it('should delete the ref (its files cascade) when external values are no longer used and one existed', () => {
      const source = parseUpdateSource({ ...sourceFields, useExternalValues: false, valueSources: [] })

      expect(buildDeploymentSourceUpdate(source, true).externalValuesRef).toEqual({ delete: true })
    })

    it('should leave the ref untouched when none existed and none was sent', () => {
      const source = parseUpdateSource({ ...sourceFields, useExternalValues: false, valueSources: [] })

      expect(buildDeploymentSourceUpdate(source, false).externalValuesRef).toEqual({})
    })
  })

  describe('serializeDeployment', () => {
    it('should tag a source with a ref and merge every value source into one list ordered by `order`', () => {
      const internalA = makeDeploymentInternalValueSource({ order: 0, path: 'a.yaml' })
      const internalB = makeDeploymentInternalValueSource({ order: 2, path: 'b.yaml' })
      const externalA = makeDeploymentExternalValueSource({ order: 1, path: 'ext.yaml' })
      const externalB = makeDeploymentExternalValueSource({ order: 3, path: 'ext-2.yaml' })
      const { valueSources: _files, ...ref } = makeDeploymentExternalValuesRef({
        ref: 'infra',
        targetRevision: 'main',
        repositoryId: externalRepositoryId,
      })
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({
          internalValueSources: [internalA, internalB],
          externalValuesRef: { ...ref, valueSources: [externalA, externalB] },
        })],
      })

      const [source] = serializeDeployment(deployment).deploymentSources

      expect(source).toMatchObject({ useExternalValues: true, externalValuesRef: ref })
      expect(source.valueSources).toEqual([
        { type: 'internal', id: internalA.id, order: 0, path: 'a.yaml' },
        { type: 'external', id: externalA.id, order: 1, path: 'ext.yaml' },
        { type: 'internal', id: internalB.id, order: 2, path: 'b.yaml' },
        { type: 'external', id: externalB.id, order: 3, path: 'ext-2.yaml' },
      ])
    })

    it('should tag a source without a ref and drop the persisted relations', () => {
      const internal = makeDeploymentInternalValueSource()
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({ internalValueSources: [internal], externalValuesRef: null })],
      })

      const [source] = serializeDeployment(deployment).deploymentSources

      expect(source.useExternalValues).toBe(false)
      expect(source).not.toHaveProperty('externalValuesRef')
      expect(source).not.toHaveProperty('internalValueSources')
      expect(source.valueSources).toEqual([{ type: 'internal', id: internal.id, order: internal.order, path: internal.path }])
    })

    it('should yield an empty list when a source has no value sources', () => {
      const deployment = makeDeploymentWithRelations({
        deploymentSources: [makeDeploymentSource({ internalValueSources: [], externalValuesRef: null })],
      })

      expect(serializeDeployment(deployment).deploymentSources[0].valueSources).toEqual([])
    })
  })
})
