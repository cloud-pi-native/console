import type { DeploymentExternalValuesRef, DeploymentValueSource, UpdateDeploymentValueSource } from '@cpn-console/shared'
import type { DeploymentSourceDraft, ValueSourcesDraft } from './deployment-draft'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import {
  disableExternalValues,
  enableExternalValues,
  newDeploymentSourceDraft,
  newInternalValueSource,
  toDeploymentDraft,
  toDeploymentSourceDraft,
  toValueSourceDraft,
  valueSourcePathPreview,
  withValueSourceList,
  withValueSourcesDraft,
} from './deployment-draft.js'

function makeInternalValueSource(order: number, path = `values-${order}.yaml`): Extract<DeploymentValueSource, { type: 'internal' }> {
  return { type: 'internal', id: faker.string.uuid(), order, path }
}

function makeExternalValueSource(order: number, path = 'ext.yaml'): DeploymentValueSource {
  return { type: 'external', id: faker.string.uuid(), order, path }
}

function makeExternalValuesRef(): DeploymentExternalValuesRef {
  return { id: faker.string.uuid(), ref: 'infra', targetRevision: 'main', repositoryId: faker.string.uuid() }
}

type ReadSource = Parameters<typeof toDeploymentSourceDraft>[0]

const sourceFields = {
  type: 'git',
  targetRevision: 'main',
  path: '/app',
  helmValuesFiles: 'values.yaml',
} satisfies Pick<ReadSource, 'type' | 'targetRevision' | 'path' | 'helmValuesFiles'>

const withExternal = {
  useExternalValues: true,
  externalValuesRef: { ref: 'infra', targetRevision: 'main', repositoryId: faker.string.uuid() },
  valueSources: [
    { type: 'internal', path: 'a.yaml' },
    { type: 'external', path: 'ext.yaml' },
  ],
} satisfies ValueSourcesDraft

describe('deploymentDraft', () => {
  describe('toValueSourceDraft', () => {
    it('should drop the persistence `order` and keep the id', () => {
      const valueSource = makeExternalValueSource(1)

      expect(toValueSourceDraft(valueSource)).toEqual({ type: 'external', id: valueSource.id, path: 'ext.yaml' })
    })
  })

  describe('toDeploymentSourceDraft', () => {
    it('should keep the tag, the writable ref fields and the value sources in order', () => {
      // The API returns value sources already ordered; the editor keeps that order.
      const internal = makeInternalValueSource(0, 'a.yaml')
      const externalA = makeExternalValueSource(1, 'ext.yaml')
      const externalB = makeExternalValueSource(2, 'ext-2.yaml')
      const externalValuesRef = makeExternalValuesRef()
      const source: ReadSource = {
        ...sourceFields,
        id: faker.string.uuid(),
        repositoryId: faker.string.uuid(),
        useExternalValues: true,
        externalValuesRef,
        valueSources: [internal, externalA, externalB],
      }

      expect(toDeploymentSourceDraft(source)).toEqual({
        ...sourceFields,
        id: source.id,
        repositoryId: source.repositoryId,
        useExternalValues: true,
        externalValuesRef: { ref: 'infra', targetRevision: 'main', repositoryId: externalValuesRef.repositoryId },
        valueSources: [
          { type: 'internal', id: internal.id, path: 'a.yaml' },
          { type: 'external', id: externalA.id, path: 'ext.yaml' },
          { type: 'external', id: externalB.id, path: 'ext-2.yaml' },
        ],
      })
    })

    it('should map a source without external values to an internal-only draft', () => {
      const internal = makeInternalValueSource(0, 'a.yaml')
      const source: ReadSource = {
        ...sourceFields,
        id: faker.string.uuid(),
        repositoryId: faker.string.uuid(),
        useExternalValues: false,
        valueSources: [internal],
      }

      const draft = toDeploymentSourceDraft(source)

      expect(draft).toMatchObject({ useExternalValues: false, valueSources: [{ type: 'internal', id: internal.id, path: 'a.yaml' }] })
      expect(draft).not.toHaveProperty('externalValuesRef')
    })
  })

  describe('toDeploymentDraft', () => {
    it('should map top-level fields and every deployment source', () => {
      const makeSource = (): ReadSource => ({ ...sourceFields, id: faker.string.uuid(), repositoryId: faker.string.uuid(), useExternalValues: false, valueSources: [] })
      const deployment = {
        id: faker.string.uuid(),
        projectId: faker.string.uuid(),
        name: 'mydeployment',
        environmentId: faker.string.uuid(),
        autosync: true,
        deploymentSources: [makeSource(), makeSource()],
      }

      const draft = toDeploymentDraft(deployment)

      expect(draft).toMatchObject({
        id: deployment.id,
        projectId: deployment.projectId,
        name: 'mydeployment',
        environmentId: deployment.environmentId,
        autosync: true,
      })
      expect(draft.deploymentSources).toHaveLength(2)
    })
  })

  describe('newDeploymentSourceDraft', () => {
    it('should default to a git source without external values', () => {
      expect(newDeploymentSourceDraft()).toEqual({ type: 'git', useExternalValues: false, valueSources: [] })
    })
  })

  describe('newInternalValueSource', () => {
    it('should default to an internal source with an empty path', () => {
      expect(newInternalValueSource()).toEqual({ type: 'internal', path: '' })
    })
  })

  describe('enableExternalValues', () => {
    it('should add an empty ref and keep the value sources', () => {
      const draft: ValueSourcesDraft = { useExternalValues: false, valueSources: [{ type: 'internal', path: 'a.yaml' }] }

      expect(enableExternalValues(draft)).toEqual({
        useExternalValues: true,
        externalValuesRef: { ref: '', targetRevision: '', repositoryId: '' },
        valueSources: [{ type: 'internal', path: 'a.yaml' }],
      })
    })
  })

  describe('disableExternalValues', () => {
    it('should drop the ref and every external value source, keeping internal order', () => {
      expect(disableExternalValues(withExternal)).toEqual({
        useExternalValues: false,
        valueSources: [{ type: 'internal', path: 'a.yaml' }],
      })
    })
  })

  describe('withValueSourceList', () => {
    it('should keep external entries when external values are used', () => {
      const next: UpdateDeploymentValueSource[] = [{ type: 'external', path: 'ext-2.yaml' }]

      expect(withValueSourceList(withExternal, next)).toEqual({ ...withExternal, valueSources: next })
    })

    it('should drop external entries when external values are not used', () => {
      const draft: ValueSourcesDraft = { useExternalValues: false, valueSources: [] }

      expect(withValueSourceList(draft, [{ type: 'internal', path: 'a.yaml' }, { type: 'external', path: 'ext.yaml' }])).toEqual({
        useExternalValues: false,
        valueSources: [{ type: 'internal', path: 'a.yaml' }],
      })
    })
  })

  describe('valueSourcePathPreview', () => {
    it('should prefix an internal file with the deployed directory', () => {
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, 'k8s', null)).toBe('k8s/values.yaml')
    })

    it('should normalize the deployed directory', () => {
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, './k8s/', null)).toBe('k8s/values.yaml')
    })

    it('should keep the leading dot of a hidden deployed directory', () => {
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, '.helm', null)).toBe('.helm/values.yaml')
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, './.helm', null)).toBe('.helm/values.yaml')
    })

    it('should show an internal file as-is when the repository root is deployed', () => {
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, '', null)).toBe('values.yaml')
      expect(valueSourcePathPreview({ type: 'internal', path: 'values.yaml' }, '.', null)).toBe('values.yaml')
    })

    it('should prefix an external file with its ref', () => {
      expect(valueSourcePathPreview({ type: 'external', path: 'staging/worker.yaml' }, 'k8s', 'values')).toBe('$values/staging/worker.yaml')
    })

    it('should show nothing for an external file without a ref name yet', () => {
      expect(valueSourcePathPreview({ type: 'external', path: 'staging/worker.yaml' }, 'k8s', '')).toBeNull()
    })

    it('should show nothing while the path is empty', () => {
      expect(valueSourcePathPreview({ type: 'internal', path: '' }, 'k8s', null)).toBeNull()
    })
  })

  describe('withValueSourcesDraft', () => {
    it('should replace the value sources without carrying a stale ref', () => {
      const source: DeploymentSourceDraft = { ...sourceFields, id: faker.string.uuid(), repositoryId: faker.string.uuid(), ...withExternal }

      const result = withValueSourcesDraft(source, disableExternalValues(source))

      expect(result).toEqual({
        ...sourceFields,
        id: source.id,
        repositoryId: source.repositoryId,
        useExternalValues: false,
        valueSources: [{ type: 'internal', path: 'a.yaml' }],
      })
      expect(result).not.toHaveProperty('externalValuesRef')
    })
  })
})
