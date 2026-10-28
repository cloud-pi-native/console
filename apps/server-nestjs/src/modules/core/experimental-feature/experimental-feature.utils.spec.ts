import { describe, expect, it } from 'vitest'
import { evaluateExperimentalFeature, parseExperimentalFeaturePublication } from './experimental-feature.utils'

const projectId = '11111111-1111-4111-8111-111111111111'
const otherProjectId = '22222222-2222-4222-8222-222222222222'
const environmentId = '33333333-3333-4333-8333-333333333333'
const clusterId = '44444444-4444-4444-8444-444444444444'

function makePublication(scope: { kind: string, id: string }) {
  return parseExperimentalFeaturePublication({
    key: 'opencds',
    revision: 1,
    rules: [{ scope, variant: 'enabled' }],
  })
}

describe('experimental feature evaluation', () => {
  it('selects the requested variant on the targeted project', () => {
    expect(evaluateExperimentalFeature(makePublication({ kind: 'project', id: projectId }), { projectId }))
      .toEqual({ status: 'selected', variant: 'enabled', revision: 1 })
  })

  it('does not activate another project', () => {
    expect(evaluateExperimentalFeature(makePublication({ kind: 'project', id: projectId }), { projectId: otherProjectId }))
      .toEqual({ status: 'not-targeted', revision: 1 })
  })

  it('does not activate when the required context is absent', () => {
    expect(evaluateExperimentalFeature(makePublication({ kind: 'project', id: projectId }), {}))
      .toEqual({ status: 'not-targeted', revision: 1 })
  })

  it.each([
    { scope: { kind: 'environment', id: environmentId }, context: { environmentId } },
    { scope: { kind: 'cluster', id: clusterId }, context: { clusterId } },
    { scope: { kind: 'instance', id: 'console' }, context: { instanceId: 'console' } },
  ])('targets the $scope.kind scope', ({ scope, context }) => {
    expect(evaluateExperimentalFeature(makePublication(scope), context))
      .toEqual({ status: 'selected', variant: 'enabled', revision: 1 })
  })

  it('requires an explicit instance context even for an instance-wide rule', () => {
    expect(evaluateExperimentalFeature(makePublication({ kind: 'instance', id: 'console' }), {}))
      .toEqual({ status: 'not-targeted', revision: 1 })
  })

  it('supports a choice of forge instead of a boolean', () => {
    const publication = parseExperimentalFeaturePublication({
      key: 'forge',
      revision: 2,
      rules: [{ scope: { kind: 'project', id: projectId }, variant: 'forgejo' }],
    })
    expect(evaluateExperimentalFeature(publication, { projectId }))
      .toEqual({ status: 'selected', variant: 'forgejo', revision: 2 })
  })

  it('does not silently resolve contradictory rules on overlapping scopes', () => {
    const publication = parseExperimentalFeaturePublication({
      key: 'forge',
      revision: 3,
      rules: [
        { scope: { kind: 'project', id: projectId }, variant: 'gitlab' },
        { scope: { kind: 'cluster', id: clusterId }, variant: 'forgejo' },
      ],
    })
    expect(evaluateExperimentalFeature(publication, { projectId, clusterId }))
      .toEqual({ status: 'conflict', revision: 3 })
  })

  it('accepts overlapping rules that select the same variant', () => {
    const publication = parseExperimentalFeaturePublication({
      key: 'opencds',
      revision: 4,
      rules: [
        { scope: { kind: 'project', id: projectId }, variant: 'enabled' },
        { scope: { kind: 'cluster', id: clusterId }, variant: 'enabled' },
      ],
    })
    expect(evaluateExperimentalFeature(publication, { projectId, clusterId }))
      .toEqual({ status: 'selected', variant: 'enabled', revision: 4 })
  })

  it('does not select a variant for an empty publication', () => {
    const publication = parseExperimentalFeaturePublication({ key: 'opencds', revision: 5, rules: [] })
    expect(evaluateExperimentalFeature(publication, { projectId }))
      .toEqual({ status: 'not-targeted', revision: 5 })
  })

  it('rejects a variant that does not belong to the experiment', () => {
    expect(() => parseExperimentalFeaturePublication({
      key: 'opencds',
      revision: 1,
      rules: [{ scope: { kind: 'project', id: projectId }, variant: 'forgejo' }],
    })).toThrow()
  })

  it('rejects an invalid target identifier', () => {
    expect(() => makePublication({ kind: 'project', id: 'not-a-project-id' })).toThrow()
  })

  it('keeps existing deployments out of the prototype catalog', () => {
    expect(() => parseExperimentalFeaturePublication({ key: 'deployments', revision: 1, rules: [] })).toThrow()
  })

  it('rejects a missing revision', () => {
    expect(() => parseExperimentalFeaturePublication({ key: 'opencds', rules: [] })).toThrow()
  })
})
