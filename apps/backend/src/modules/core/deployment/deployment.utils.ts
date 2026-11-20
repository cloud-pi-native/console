import type {
  CreateDeployment,
  CreateDeploymentSource,
  DeploymentSource,
  UpdateDeployment,
  UpdateDeploymentSource,
  WritableDeploymentExternalValuesRef,
} from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { DeploymentWithRelations } from './deployment-datastore.service'

// ---------------------------------------------------------------------------
// Precise write model (the "parse, don't validate" boundary representation)
//
// The wire payloads (CreateDeployment / UpdateDeployment) carry value sources as
// a single ordered list discriminated by `type`, with an optional `id` on update
// entries. The contract already ties external entries to the external ref through
// the `useExternalValues` tag; these types go further and are the representation
// the rest of the module operates on. Producing them once, up front (see the
// `parse*` functions), makes two facts structural rather than runtime concerns:
//   - external value sources only exist nested under the external ref, as they
//     are stored;
//   - an entry is either created or updated (separate buckets, no optional id and
//     no fabricated placeholder ids downstream).
// ---------------------------------------------------------------------------

interface InternalValueSource {
  path: string
  order: number
}

interface ExternalValueSource {
  path: string
  order: number
}

interface ExternalValuesRef {
  ref: string
  targetRevision: string
  repositoryId: string
}

interface CreateValueSources {
  internal: InternalValueSource[]
  external?: ExternalValuesRef & { files: ExternalValueSource[] }
}

interface UpdateValueSources {
  internalToCreate: InternalValueSource[]
  internalToUpdate: (InternalValueSource & { id: string })[]
  external?: ExternalValuesRef & {
    filesToCreate: ExternalValueSource[]
    filesToUpdate: (ExternalValueSource & { id: string })[]
  }
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

function toExternalValuesRef(externalValuesRef: WritableDeploymentExternalValuesRef): ExternalValuesRef {
  return {
    ref: externalValuesRef.ref,
    targetRevision: externalValuesRef.targetRevision,
    repositoryId: externalValuesRef.repositoryId,
  }
}

// `order` is the entry's position in the client-submitted list, preserving the
// interleaving between internal and external value sources (both are merged by
// `order` when the deployment is rendered). Ids are ignored: everything is new.
function parseCreateValueSources(source: CreateDeploymentSource | UpdateDeploymentSource): CreateValueSources {
  if (!source.useExternalValues) {
    return { internal: source.valueSources.map(({ path }, order) => ({ path, order })) }
  }

  const internal: InternalValueSource[] = []
  const files: ExternalValueSource[] = []
  source.valueSources.forEach(({ type, path }, order) => {
    const bucket = type === 'internal' ? internal : files
    bucket.push({ path, order })
  })

  return { internal, external: { ...toExternalValuesRef(source.externalValuesRef), files } }
}

function parseUpdateValueSources(source: UpdateDeploymentSource): UpdateValueSources {
  const internalToCreate: InternalValueSource[] = []
  const internalToUpdate: (InternalValueSource & { id: string })[] = []
  const filesToCreate: ExternalValueSource[] = []
  const filesToUpdate: (ExternalValueSource & { id: string })[] = []

  source.valueSources.forEach((valueSource, order) => {
    const toCreate = valueSource.type === 'internal' ? internalToCreate : filesToCreate
    const toUpdate = valueSource.type === 'internal' ? internalToUpdate : filesToUpdate
    if (valueSource.id) {
      toUpdate.push({ id: valueSource.id, path: valueSource.path, order })
    } else {
      toCreate.push({ path: valueSource.path, order })
    }
  })

  return source.useExternalValues
    ? { internalToCreate, internalToUpdate, external: { ...toExternalValuesRef(source.externalValuesRef), filesToCreate, filesToUpdate } }
    : { internalToCreate, internalToUpdate }
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
      valueSources: parseCreateValueSources(source),
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
        valueSources: parseUpdateValueSources(source),
      })
    } else {
      deploymentSourcesToCreate.push({
        ...toDeploymentSourceFields(source),
        valueSources: parseCreateValueSources(source),
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

function mapExternalCreate({ path, order }: ExternalValueSource): Prisma.DeploymentExternalValueSourceCreateWithoutExternalValuesRefInput {
  return { path, order }
}

function mapExternalValuesRefFields(external: ExternalValuesRef) {
  return {
    ref: external.ref,
    targetRevision: external.targetRevision,
    repository: { connect: { id: external.repositoryId } },
  } satisfies Prisma.DeploymentExternalValuesRefUpdateWithoutDeploymentSourceInput
}

function mapExternalValuesRefCreate(external: ExternalValuesRef, files: ExternalValueSource[]): Prisma.DeploymentExternalValuesRefCreateWithoutDeploymentSourceInput {
  return {
    ...mapExternalValuesRefFields(external),
    valueSources: { create: files.map(mapExternalCreate) },
  }
}

interface ValueSourcesCreate {
  internalValueSources: Prisma.DeploymentInternalValueSourceCreateNestedManyWithoutDeploymentSourceInput
  externalValuesRef?: Prisma.DeploymentExternalValuesRefCreateNestedOneWithoutDeploymentSourceInput
}

interface ValueSourcesUpdate {
  internalValueSources: Prisma.DeploymentInternalValueSourceUpdateManyWithoutDeploymentSourceNestedInput
  externalValuesRef: Prisma.DeploymentExternalValuesRefUpdateOneWithoutDeploymentSourceNestedInput
}

function buildValueSourcesCreate(valueSources: CreateValueSources): ValueSourcesCreate {
  return {
    internalValueSources: { create: valueSources.internal.map(mapInternalCreate) },
    ...(valueSources.external
      ? { externalValuesRef: { create: mapExternalValuesRefCreate(valueSources.external, valueSources.external.files) } }
      : {}),
  }
}

// Reconciles the external ref of an existing deployment source. Its files are
// owned by the ref: they are reconciled by id when the ref is kept, created with
// it when it is new (any ids sent cannot exist yet), and cascade with its delete.
// `hadExternalValuesRef` picks between these, as Prisma rejects updating or
// deleting a missing relation.
function buildExternalValuesRefUpdate(
  external: UpdateValueSources['external'],
  hadExternalValuesRef: boolean,
): Prisma.DeploymentExternalValuesRefUpdateOneWithoutDeploymentSourceNestedInput {
  if (!external) return hadExternalValuesRef ? { delete: true } : {}

  if (!hadExternalValuesRef) {
    return { create: mapExternalValuesRefCreate(external, [...external.filesToCreate, ...external.filesToUpdate]) }
  }

  return {
    update: {
      ...mapExternalValuesRefFields(external),
      valueSources: {
        deleteMany: { id: { notIn: external.filesToUpdate.map(({ id }) => id) } },
        create: external.filesToCreate.map(mapExternalCreate),
        update: external.filesToUpdate.map(({ id, path, order }) => ({
          where: { id },
          data: { path, order },
        })),
      },
    },
  }
}

// Reconciles an existing deployment source's value sources. Internal sources are
// created/updated by id (deleteMany drops the ones the client no longer sends).
function buildValueSourcesUpdate(valueSources: UpdateValueSources, hadExternalValuesRef: boolean): ValueSourcesUpdate {
  return {
    internalValueSources: {
      deleteMany: { id: { notIn: valueSources.internalToUpdate.map(({ id }) => id) } },
      create: valueSources.internalToCreate.map(mapInternalCreate),
      update: valueSources.internalToUpdate.map(({ id, path, order }) => ({
        where: { id },
        data: { path, order },
      })),
    },
    externalValuesRef: buildExternalValuesRefUpdate(valueSources.external, hadExternalValuesRef),
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

// Nested-write payload reconciling an existing deployment source. `hadExternalValuesRef`
// reflects whether the persisted source currently owns an external ref.
export function buildDeploymentSourceUpdate(source: UpdateDeploymentSourceModel, hadExternalValuesRef: boolean): Prisma.DeploymentSourceUpdateWithoutDeploymentInput {
  return {
    type: source.type,
    repository: { connect: { id: source.repositoryId } },
    targetRevision: source.targetRevision,
    path: source.path,
    helmValuesFiles: source.helmValuesFiles,
    ...buildValueSourcesUpdate(source.valueSources, hadExternalValuesRef),
  }
}

// ---------------------------------------------------------------------------
// Read serialization — the API exposes value sources the same way it accepts
// them: a single ordered, discriminated list, tagged by `useExternalValues`. The
// persisted relations are a storage detail, merged here (by `order`) once,
// server-side, so no consumer has to reconstruct the list.
// ---------------------------------------------------------------------------

type PersistedDeploymentSource = DeploymentWithRelations['deploymentSources'][number]
type PersistedExternalValuesRef = NonNullable<PersistedDeploymentSource['externalValuesRef']>
type InternalReadValueSource = Extract<DeploymentSource['valueSources'][number], { type: 'internal' }>
type ReadValueSource = DeploymentSource['valueSources'][number]

type SerializedDeploymentSourceBase = Omit<PersistedDeploymentSource, 'internalValueSources' | 'externalValuesRef'>
type SerializedDeploymentSource = SerializedDeploymentSourceBase & (
  | { useExternalValues: false, valueSources: InternalReadValueSource[] }
  | { useExternalValues: true, externalValuesRef: Omit<PersistedExternalValuesRef, 'valueSources'>, valueSources: ReadValueSource[] }
)
export type SerializedDeployment = Omit<DeploymentWithRelations, 'deploymentSources'> & { deploymentSources: SerializedDeploymentSource[] }

function toInternalReadValueSource(valueSource: PersistedDeploymentSource['internalValueSources'][number]): InternalReadValueSource {
  return { type: 'internal', id: valueSource.id, order: valueSource.order, path: valueSource.path }
}

function serializeDeploymentSource({ internalValueSources, externalValuesRef, ...source }: PersistedDeploymentSource): SerializedDeploymentSource {
  const internal = internalValueSources.map(toInternalReadValueSource)
  if (!externalValuesRef) {
    return { ...source, useExternalValues: false, valueSources: internal.toSorted((a, b) => a.order - b.order) }
  }

  const { valueSources: files, ...ref } = externalValuesRef
  const external = files.map((valueSource): ReadValueSource => ({
    type: 'external',
    id: valueSource.id,
    order: valueSource.order,
    path: valueSource.path,
  }))
  return {
    ...source,
    useExternalValues: true,
    externalValuesRef: ref,
    valueSources: [...internal, ...external].toSorted((a, b) => a.order - b.order),
  }
}

// Reshapes a persisted deployment into the API read shape: each source's value
// source relations collapse into a single ordered `valueSources` list.
export function serializeDeployment(deployment: DeploymentWithRelations): SerializedDeployment {
  return {
    ...deployment,
    deploymentSources: deployment.deploymentSources.map(serializeDeploymentSource),
  }
}
