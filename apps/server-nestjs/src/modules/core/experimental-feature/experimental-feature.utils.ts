import type {
  ExperimentalFeatureContext,
  ExperimentalFeatureEvaluation,
  ExperimentalFeaturePublication,
  ExperimentalFeatureScope,
  ExperimentalFeatureTarget,
  ExperimentalFeatureVariant,
} from '@cpn-console/shared'
import type { ExperimentalFeatureTargetRecord } from './experimental-feature-queries.utils'
import { ExperimentalFeatureContextSchema, ExperimentalFeaturePublicationSchema, ExperimentalFeatureTargetSchema } from '@cpn-console/shared'

export function parseExperimentalFeaturePublication(input: unknown): ExperimentalFeaturePublication {
  return ExperimentalFeaturePublicationSchema.parse(input)
}

export function toExperimentalFeatureTarget(record: ExperimentalFeatureTargetRecord): ExperimentalFeatureTarget {
  return ExperimentalFeatureTargetSchema.parse({
    id: record.id,
    key: record.featureKey,
    scope: { kind: record.scopeKind, id: record.scopeId },
    requested: record.requested,
    revision: record.revision,
    application: 'not-observed',
    events: record.events.map(event => ({ ...event, createdAt: event.createdAt.toISOString() })),
  })
}

function matchesScope(scope: ExperimentalFeatureScope, context: ExperimentalFeatureContext): boolean {
  switch (scope.kind) {
    case 'instance': return context.instanceId === scope.id
    case 'cluster': return context.clusterId === scope.id
    case 'project': return context.projectId === scope.id
    case 'environment': return context.environmentId === scope.id
  }
}

export function evaluateExperimentalFeature(
  publication: ExperimentalFeaturePublication,
  input: unknown,
): ExperimentalFeatureEvaluation {
  const context = ExperimentalFeatureContextSchema.parse(input)
  let selected: ExperimentalFeatureVariant | undefined

  for (const rule of publication.rules) {
    if (!matchesScope(rule.scope, context)) continue
    if (selected !== undefined && selected !== rule.variant) {
      return { status: 'conflict', revision: publication.revision }
    }
    selected = rule.variant
  }

  return selected === undefined
    ? { status: 'not-targeted', revision: publication.revision }
    : { status: 'selected', variant: selected, revision: publication.revision }
}
