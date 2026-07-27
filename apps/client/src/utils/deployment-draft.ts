import type {
  Deployment,
  DeploymentSource,
  DeploymentValueSource,
  UpdateDeployment,
  UpdateDeploymentSource,
  UpdateDeploymentValueSource,
} from '@cpn-console/shared'

type ReadDeploymentSource = Pick<
  DeploymentSource,
'id' | 'type' | 'repositoryId' | 'targetRevision' | 'path' | 'helmValuesFiles' | 'valueSources'
>
type ReadDeployment = Pick<
  Deployment,
'id' | 'projectId' | 'name' | 'environmentId' | 'autosync'
> & { deploymentSources: ReadDeploymentSource[] }

export function toValueSourceDraft(valueSource: DeploymentValueSource): UpdateDeploymentValueSource {
  return valueSource.type === 'external'
    ? {
        type: 'external',
        id: valueSource.id,
        path: valueSource.path,
        ref: valueSource.ref,
        targetRevision: valueSource.targetRevision,
        repositoryId: valueSource.repositoryId,
      }
    : { type: 'internal', id: valueSource.id, path: valueSource.path }
}

export function toDeploymentSourceDraft(source: ReadDeploymentSource): UpdateDeploymentSource {
  return {
    id: source.id,
    type: source.type,
    repositoryId: source.repositoryId,
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    valueSources: source.valueSources.map(toValueSourceDraft),
  }
}

export function toDeploymentDraft(deployment: ReadDeployment): Partial<UpdateDeployment & { id: string }> {
  return {
    id: deployment.id,
    projectId: deployment.projectId,
    name: deployment.name,
    environmentId: deployment.environmentId,
    autosync: deployment.autosync,
    deploymentSources: deployment.deploymentSources.map(toDeploymentSourceDraft),
  }
}

export function newInternalValueSource(): UpdateDeploymentValueSource {
  return { type: 'internal', path: '' }
}

// At most one external value source is allowed per deployment source.
export function hasExternalValueSource(valueSources: Pick<UpdateDeploymentValueSource, 'type'>[]): boolean {
  return valueSources.some(valueSource => valueSource.type === 'external')
}
