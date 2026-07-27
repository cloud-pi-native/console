import type { Deployment, DeploymentSource, DeploymentValueSource } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import {
  hasExternalValueSource,
  newInternalValueSource,
  toDeploymentDraft,
  toDeploymentSourceDraft,
  toValueSourceDraft,
} from './deployment-draft.js'

type ReadSource = Pick<DeploymentSource, 'id' | 'type' | 'repositoryId' | 'targetRevision' | 'path' | 'helmValuesFiles' | 'valueSources'>

function makeInternalValueSource(order: number, path = `values-${order}.yaml`): DeploymentValueSource {
  return { type: 'internal', id: faker.string.uuid(), order, path }
}

function makeExternalValueSource(order: number): DeploymentValueSource {
  return { type: 'external', id: faker.string.uuid(), order, path: 'ext.yaml', ref: 'infra', targetRevision: 'main', repositoryId: faker.string.uuid() }
}

function makeReadSource(overrides: Partial<ReadSource> = {}): ReadSource {
  return {
    id: faker.string.uuid(),
    type: 'git',
    repositoryId: faker.string.uuid(),
    targetRevision: 'main',
    path: '/app',
    helmValuesFiles: 'values.yaml',
    valueSources: [],
    ...overrides,
  }
}

describe('deploymentDraft', () => {
  describe('toValueSourceDraft', () => {
    it('should drop the persistence `order` from an internal source and keep its id', () => {
      const valueSource = makeInternalValueSource(3, 'a.yaml')

      expect(toValueSourceDraft(valueSource)).toEqual({ type: 'internal', id: valueSource.id, path: 'a.yaml' })
    })

    it('should keep every external field except `order`', () => {
      const valueSource = makeExternalValueSource(1)

      expect(toValueSourceDraft(valueSource)).toEqual({
        type: 'external',
        id: valueSource.id,
        path: 'ext.yaml',
        ref: 'infra',
        targetRevision: 'main',
        repositoryId: valueSource.repositoryId,
      })
    })
  })

  describe('toDeploymentSourceDraft', () => {
    it('should map the value sources in order and keep the writable fields', () => {
      // The API returns value sources already ordered; the editor keeps that order.
      const internal = makeInternalValueSource(0, 'a.yaml')
      const external = makeExternalValueSource(1)
      const source = makeReadSource({ valueSources: [internal, external] })

      expect(toDeploymentSourceDraft(source)).toEqual({
        id: source.id,
        type: 'git',
        repositoryId: source.repositoryId,
        targetRevision: 'main',
        path: '/app',
        helmValuesFiles: 'values.yaml',
        valueSources: [
          { type: 'internal', id: internal.id, path: 'a.yaml' },
          {
            type: 'external',
            id: external.id,
            path: 'ext.yaml',
            ref: 'infra',
            targetRevision: 'main',
            repositoryId: external.repositoryId,
          },
        ],
      })
    })
  })

  describe('toDeploymentDraft', () => {
    it('should map top-level fields and every deployment source', () => {
      const deployment = {
        id: faker.string.uuid(),
        projectId: faker.string.uuid(),
        name: 'mydeployment',
        environmentId: faker.string.uuid(),
        autosync: true,
        deploymentSources: [makeReadSource(), makeReadSource()],
      } satisfies Pick<
        Deployment,
        'id'
        | 'projectId'
        | 'name'
        | 'environmentId'
        | 'autosync'
      > & { deploymentSources: ReadSource[] }

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

  describe('newInternalValueSource', () => {
    it('should default to an internal source with an empty path', () => {
      expect(newInternalValueSource()).toEqual({ type: 'internal', path: '' })
    })
  })

  describe('hasExternalValueSource', () => {
    it('should be true when at least one source is external', () => {
      expect(hasExternalValueSource([{ type: 'internal' }, { type: 'external' }])).toBe(true)
    })

    it('should be false when every source is internal', () => {
      expect(hasExternalValueSource([{ type: 'internal' }, { type: 'internal' }])).toBe(false)
    })
  })
})
