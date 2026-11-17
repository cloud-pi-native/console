import type {
  DeploymentSource,
  DeploymentValueSource,
  UpdateDeployment,
  UpdateDeploymentInternalValueSource,
  UpdateDeploymentSource,
  UpdateDeploymentValueSource,
  WritableDeploymentExternalValuesRef,
} from '@cpn-console/shared'

type DeploymentSourceFieldKeys = 'id' | 'type' | 'repositoryId' | 'targetRevision' | 'path' | 'helmValuesFiles'

// The form keeps the contract's `useExternalValues` tag, so an external value
// source can never sit in a draft that has no ref to resolve against.
type InternalOnlyValueSourcesDraft = Pick<Extract<UpdateDeploymentSource, { useExternalValues: false }>, 'useExternalValues' | 'valueSources'>
type WithExternalValueSourcesDraft = Pick<Extract<UpdateDeploymentSource, { useExternalValues: true }>, 'useExternalValues' | 'externalValuesRef' | 'valueSources'>
export type ValueSourcesDraft = InternalOnlyValueSourcesDraft | WithExternalValueSourcesDraft
export type DeploymentSourceDraft = Partial<Pick<UpdateDeploymentSource, DeploymentSourceFieldKeys>> & ValueSourcesDraft
export type DeploymentDraft = Partial<Omit<UpdateDeployment, 'deploymentSources'>> & { id?: string, deploymentSources?: DeploymentSourceDraft[] }

type ReadValueSources
  = | Pick<Extract<DeploymentSource, { useExternalValues: false }>, 'useExternalValues' | 'valueSources'>
    | Pick<Extract<DeploymentSource, { useExternalValues: true }>, 'useExternalValues' | 'externalValuesRef' | 'valueSources'>
type ReadDeploymentSource = Pick<DeploymentSource, DeploymentSourceFieldKeys> & ReadValueSources
interface ReadDeployment {
  id: string
  projectId: string
  name: string
  environmentId: string
  autosync: boolean
  deploymentSources: ReadDeploymentSource[]
}

export function toValueSourceDraft(valueSource: DeploymentValueSource): UpdateDeploymentValueSource {
  return { type: valueSource.type, id: valueSource.id, path: valueSource.path }
}

function toInternalValueSourceDraft(valueSource: Extract<DeploymentValueSource, { type: 'internal' }>): UpdateDeploymentInternalValueSource {
  return { type: 'internal', id: valueSource.id, path: valueSource.path }
}

function toValueSourcesDraft(source: ReadValueSources): ValueSourcesDraft {
  if (!source.useExternalValues) {
    return { useExternalValues: false, valueSources: source.valueSources.map(toInternalValueSourceDraft) }
  }
  const { ref, targetRevision, repositoryId } = source.externalValuesRef
  return {
    useExternalValues: true,
    externalValuesRef: { ref, targetRevision, repositoryId },
    valueSources: source.valueSources.map(toValueSourceDraft),
  }
}

export function toDeploymentSourceDraft(source: ReadDeploymentSource): DeploymentSourceDraft {
  return {
    id: source.id,
    type: source.type,
    repositoryId: source.repositoryId,
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    ...toValueSourcesDraft(source),
  }
}

export function toDeploymentDraft(deployment: ReadDeployment): DeploymentDraft {
  return {
    id: deployment.id,
    projectId: deployment.projectId,
    name: deployment.name,
    environmentId: deployment.environmentId,
    autosync: deployment.autosync,
    deploymentSources: deployment.deploymentSources.map(toDeploymentSourceDraft),
  }
}

export function newDeploymentSourceDraft(): DeploymentSourceDraft {
  return { type: 'git', useExternalValues: false, valueSources: [] }
}

export function newInternalValueSource(): UpdateDeploymentInternalValueSource {
  return { type: 'internal', path: '' }
}

export function newExternalValuesRef(): WritableDeploymentExternalValuesRef {
  return { ref: '', targetRevision: '', repositoryId: '' }
}

function isInternalValueSource(valueSource: UpdateDeploymentValueSource): valueSource is UpdateDeploymentInternalValueSource {
  return valueSource.type === 'internal'
}

// Replaces the value source list; without a ref, external entries cannot be kept.
export function withValueSourceList(draft: ValueSourcesDraft, valueSources: UpdateDeploymentValueSource[]): ValueSourcesDraft {
  return draft.useExternalValues
    ? { ...draft, valueSources }
    : { useExternalValues: false, valueSources: valueSources.filter(isInternalValueSource) }
}

export function enableExternalValues(draft: ValueSourcesDraft): ValueSourcesDraft {
  return { useExternalValues: true, externalValuesRef: newExternalValuesRef(), valueSources: draft.valueSources }
}

// External value sources resolve against the ref, so disabling it drops them too.
export function disableExternalValues(draft: ValueSourcesDraft): ValueSourcesDraft {
  // Widened to one array type: `.filter` on a union of arrays loses its type guard overload.
  const valueSources: UpdateDeploymentValueSource[] = draft.valueSources
  return { useExternalValues: false, valueSources: valueSources.filter(isInternalValueSource) }
}

// The path Helm resolves a value source to: internal files are relative to the
// deployed directory (empty or `.` is the repository root, as ArgoCD defaults it),
// external ones to the external ref. Null while there is nothing to show.
export function valueSourcePathPreview(valueSource: UpdateDeploymentValueSource, deployPath: string, externalRef: string | null): string | null {
  if (!valueSource.path) return null
  if (valueSource.type === 'external') return externalRef ? `$${externalRef}/${valueSource.path}` : null

  const directory = trimTrailingSlashes(deployPath.replace(/^\.(\/|$)/, ''))
  return directory ? `${directory}/${valueSource.path}` : valueSource.path
}

// A loop instead of `/\/+$/`, which retries from every slash and goes quadratic on
// inputs like `a//////b` (Sonar S5852).
function trimTrailingSlashes(path: string): string {
  let end = path.length
  while (end > 0 && path[end - 1] === '/') end--
  return path.slice(0, end)
}

// Rebuilds the source from its own fields plus the new value sources, so a ref
// left over from a disabled draft is not carried along.
export function withValueSourcesDraft(source: DeploymentSourceDraft, draft: ValueSourcesDraft): DeploymentSourceDraft {
  return {
    id: source.id,
    type: source.type,
    repositoryId: source.repositoryId,
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    ...draft,
  }
}
