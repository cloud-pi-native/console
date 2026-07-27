import type {
  CreateDeployment,
  CreateDeploymentSource,
  CreateDeploymentValueSource,
  DeploymentValueSource,
  UpdateDeployment,
  UpdateDeploymentSource,
  UpdateDeploymentValueSource,
} from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { DeploymentWithRelations } from './deployment-datastore.service'

// ---------------------------------------------------------------------------
// Precise write model (the "parse, don't validate" boundary representation)
//
// The wire payloads (CreateDeployment / UpdateDeployment) carry value sources as
// a single ordered list discriminated by `type`, with an optional `id` on update
// entries. That shape is ergonomic for clients but imprecise for the server: it
// permits states the domain forbids (many externals) and states we must branch on
// later (id present or not). These types are the precise representation the rest
// of the module operates on. Producing them once, up front (see the `parse*`
// functions), makes two facts structural rather than runtime concerns:
//   - a deployment source has at most one external value source (single optional
//     field, not a list);
//   - an entry is either created or updated (separate buckets, no optional id and
//     no fabricated placeholder ids downstream).
// ---------------------------------------------------------------------------

interface InternalValueSource {
  path: string
  order: number
}

interface ExternalValueSource {
  path: string
  ref: string
  targetRevision: string
  repositoryId: string
  order: number
}

interface CreateValueSources {
  internal: InternalValueSource[]
  external?: ExternalValueSource
}

interface UpdateValueSources {
  internalToCreate: InternalValueSource[]
  internalToUpdate: (InternalValueSource & { id: string })[]
  external?: ExternalValueSource
}

interface DeploymentSourceFields {
  type: CreateDeploymentSource['type']
  repositoryId: string
  targetRevision?: string
  path?: string
  helmValuesFiles?: string
}

interface CreateDeploymentSourceModel extends DeploymentSourceFields {
  valueSources: CreateValueSources
}

interface UpdateDeploymentSourceModel extends DeploymentSourceFields {
  id: string
  valueSources: UpdateValueSources
}

export interface CreateDeploymentModel {
  name: string
  autosync: boolean
  environmentId: string
  deploymentSources: CreateDeploymentSourceModel[]
}

export interface UpdateDeploymentModel {
  name: string
  autosync: boolean
  environmentId: string
  deploymentSourcesToCreate: CreateDeploymentSourceModel[]
  deploymentSourcesToUpdate: UpdateDeploymentSourceModel[]
}

// `order` is the entry's position in the client-submitted list, preserving the
// interleaving between internal and external value sources (both are merged by
// `order` when the deployment is rendered).
function toExternalValueSource(valueSource: Extract<CreateDeploymentValueSource, { type: 'external' }>, order: number): ExternalValueSource {
  return {
    path: valueSource.path,
    ref: valueSource.ref,
    targetRevision: valueSource.targetRevision,
    repositoryId: valueSource.repositoryId,
    order,
  }
}

function parseCreateValueSources(valueSources: CreateDeploymentValueSource[]): CreateValueSources {
  const internal: InternalValueSource[] = []
  let external: ExternalValueSource | undefined

  valueSources.forEach((valueSource, order) => {
    if (valueSource.type === 'internal') {
      internal.push({ path: valueSource.path, order })
    } else {
      external = toExternalValueSource(valueSource, order)
    }
  })

  return external ? { internal, external } : { internal }
}

function parseUpdateValueSources(valueSources: UpdateDeploymentValueSource[]): UpdateValueSources {
  const internalToCreate: InternalValueSource[] = []
  const internalToUpdate: (InternalValueSource & { id: string })[] = []
  let external: ExternalValueSource | undefined

  valueSources.forEach((valueSource, order) => {
    if (valueSource.type === 'internal') {
      if (valueSource.id) {
        internalToUpdate.push({ id: valueSource.id, path: valueSource.path, order })
      } else {
        internalToCreate.push({ path: valueSource.path, order })
      }
    } else {
      external = toExternalValueSource(valueSource, order)
    }
  })

  return external ? { internalToCreate, internalToUpdate, external } : { internalToCreate, internalToUpdate }
}

function toDeploymentSourceFields(source: CreateDeploymentSource | UpdateDeploymentSource): DeploymentSourceFields {
  return {
    type: source.type,
    repositoryId: source.repositoryId,
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
  }
}

// Boundary parse for a creation payload: every value source is a fresh insert.
export function parseCreateDeployment(deployment: CreateDeployment): CreateDeploymentModel {
  return {
    name: deployment.name,
    autosync: deployment.autosync,
    environmentId: deployment.environmentId,
    deploymentSources: deployment.deploymentSources.map(source => ({
      ...toDeploymentSourceFields(source),
      valueSources: parseCreateValueSources(source.valueSources),
    })),
  }
}

// Boundary parse for an update payload: deployment sources (and their value
// sources) are split by whether the client sent an id.
export function parseUpdateDeployment(deployment: UpdateDeployment): UpdateDeploymentModel {
  const deploymentSourcesToCreate: CreateDeploymentSourceModel[] = []
  const deploymentSourcesToUpdate: UpdateDeploymentSourceModel[] = []

  for (const source of deployment.deploymentSources) {
    if (source.id) {
      deploymentSourcesToUpdate.push({
        ...toDeploymentSourceFields(source),
        id: source.id,
        valueSources: parseUpdateValueSources(source.valueSources),
      })
    } else {
      deploymentSourcesToCreate.push({
        ...toDeploymentSourceFields(source),
        valueSources: parseCreateValueSources(source.valueSources),
      })
    }
  }

  return {
    name: deployment.name,
    autosync: deployment.autosync,
    environmentId: deployment.environmentId,
    deploymentSourcesToCreate,
    deploymentSourcesToUpdate,
  }
}

// ---------------------------------------------------------------------------
// Prisma write builders — pure translations of the precise model above into
// nested-write inputs. They perform no partitioning or disambiguation; that has
// already happened at the boundary.
// ---------------------------------------------------------------------------

function mapInternalCreate({ path, order }: InternalValueSource): Prisma.DeploymentInternalValueSourceCreateWithoutDeploymentSourceInput {
  return { path, order }
}

function mapExternalCreate(external: ExternalValueSource): Prisma.DeploymentExternalValueSourceCreateWithoutDeploymentSourceInput {
  return {
    order: external.order,
    path: external.path,
    ref: external.ref,
    targetRevision: external.targetRevision,
    repository: { connect: { id: external.repositoryId } },
  }
}

function mapExternalUpdate(external: ExternalValueSource): Prisma.DeploymentExternalValueSourceUpdateWithoutDeploymentSourceInput {
  return mapExternalCreate(external)
}

interface ValueSourcesCreate {
  internalValueSources: Prisma.DeploymentInternalValueSourceCreateNestedManyWithoutDeploymentSourceInput
  externalValueSource?: Prisma.DeploymentExternalValueSourceCreateNestedOneWithoutDeploymentSourceInput
}

interface ValueSourcesUpdate {
  internalValueSources: Prisma.DeploymentInternalValueSourceUpdateManyWithoutDeploymentSourceNestedInput
  externalValueSource: Prisma.DeploymentExternalValueSourceUpdateOneWithoutDeploymentSourceNestedInput
}

function buildValueSourcesCreate(valueSources: CreateValueSources): ValueSourcesCreate {
  return {
    internalValueSources: { create: valueSources.internal.map(mapInternalCreate) },
    ...(valueSources.external ? { externalValueSource: { create: mapExternalCreate(valueSources.external) } } : {}),
  }
}

// Reconciles an existing deployment source's value sources. Internal sources are
// created/updated by id (deleteMany drops the ones the client no longer sends);
// the single external source is upserted, or deleted when the client removed it —
// `hadExternal` guards the delete, which Prisma rejects on a missing relation.
function buildValueSourcesUpdate(valueSources: UpdateValueSources, hadExternal: boolean): ValueSourcesUpdate {
  const keptInternalIds = valueSources.internalToUpdate.map(({ id }) => id)

  let externalValueSource: Prisma.DeploymentExternalValueSourceUpdateOneWithoutDeploymentSourceNestedInput
  if (valueSources.external) {
    externalValueSource = { upsert: { update: mapExternalUpdate(valueSources.external), create: mapExternalCreate(valueSources.external) } }
  } else if (hadExternal) {
    externalValueSource = { delete: true }
  } else {
    externalValueSource = {}
  }

  return {
    internalValueSources: {
      deleteMany: { id: { notIn: keptInternalIds } },
      create: valueSources.internalToCreate.map(mapInternalCreate),
      update: valueSources.internalToUpdate.map(({ id, path, order }) => ({
        where: { id },
        data: { path, order },
      })),
    },
    externalValueSource,
  }
}

// Nested-write payload for a freshly created deployment source.
export function buildDeploymentSourceCreate(source: CreateDeploymentSourceModel): Prisma.DeploymentSourceCreateWithoutDeploymentInput {
  return {
    type: source.type,
    repository: { connect: { id: source.repositoryId } },
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    ...buildValueSourcesCreate(source.valueSources),
  }
}

// Nested-write payload reconciling an existing deployment source. `hadExternal`
// reflects whether the persisted source currently owns an external value source.
export function buildDeploymentSourceUpdate(source: UpdateDeploymentSourceModel, hadExternal: boolean): Prisma.DeploymentSourceUpdateWithoutDeploymentInput {
  return {
    type: source.type,
    repository: { connect: { id: source.repositoryId } },
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    ...buildValueSourcesUpdate(source.valueSources, hadExternal),
  }
}

// ---------------------------------------------------------------------------
// Read serialization — the API exposes value sources the same way it accepts
// them: a single ordered, discriminated list. The two persisted relations are a
// storage detail, merged here (by `order`) once, server-side, so no consumer has
// to reconstruct the list.
// ---------------------------------------------------------------------------

// A deployment source as loaded from the database, with the relations the read
// serialization needs.
type PersistedDeploymentSource = Prisma.DeploymentSourceGetPayload<{
  include: {
    repository: true
    internalValueSources: true
    externalValueSource: true
  }
}>

type SerializedDeploymentSource = Omit<PersistedDeploymentSource, 'internalValueSources' | 'externalValueSource'> & { valueSources: DeploymentValueSource[] }
export type SerializedDeployment = Omit<DeploymentWithRelations, 'deploymentSources'> & { deploymentSources: SerializedDeploymentSource[] }

function mergeValueSources(source: PersistedDeploymentSource): DeploymentValueSource[] {
  const internal = source.internalValueSources.map((valueSource): DeploymentValueSource => ({
    type: 'internal',
    id: valueSource.id,
    order: valueSource.order,
    path: valueSource.path,
  }))
  const external: DeploymentValueSource[] = source.externalValueSource
    ? [{
        type: 'external',
        id: source.externalValueSource.id,
        order: source.externalValueSource.order,
        path: source.externalValueSource.path,
        ref: source.externalValueSource.ref,
        targetRevision: source.externalValueSource.targetRevision,
        repositoryId: source.externalValueSource.repositoryId,
      }]
    : []

  return [...internal, ...external].sort((a, b) => a.order - b.order)
}

// Reshapes a persisted deployment into the API read shape: each source's two value
// source relations collapse into a single ordered `valueSources` list.
export function serializeDeployment(deployment: DeploymentWithRelations): SerializedDeployment {
  return {
    ...deployment,
    deploymentSources: deployment.deploymentSources.map(({ internalValueSources, externalValueSource, ...source }) => ({
      ...source,
      valueSources: mergeValueSources({ internalValueSources, externalValueSource, ...source }),
    })),
  }
}
