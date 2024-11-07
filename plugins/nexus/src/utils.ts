import type { HookPayload, Project, ProjectLite } from '@cpn-console/hooks'
import { defaultOrNullish, specificallyEnabled } from '@cpn-console/hooks'
import type { AxiosInstance } from 'axios'

export async function deleteIfExists(url: string, axiosInstance: AxiosInstance) {
  const res = await axiosInstance({
    method: 'get',
    url,
    validateStatus: code => code === 404 || code < 300,
  })
  if (res.status !== 404) {
    // delete maven group
    return axiosInstance({
      method: 'delete',
      url,
      validateStatus: code => code === 404 || code < 300,
    })
  }
  return res
}

export function getTechUsed(payload: HookPayload<Project | ProjectLite>) {
  const projectStore = payload.args.store.nexus
  const globalConfig = payload.config.nexus
  const techUsed = {
    maven: false,
    npm: false,
  }
  if (specificallyEnabled(projectStore?.activateMavenRepo)) {
    techUsed.maven = true
  } else if (defaultOrNullish(projectStore?.activateMavenRepo) && specificallyEnabled(globalConfig?.activateMavenRepoDefaultValue)) {
    techUsed.maven = true
  }
  if (specificallyEnabled(projectStore?.activateNpmRepo)) {
    techUsed.npm = true
  } else if (defaultOrNullish(projectStore?.activateMavenRepo) && specificallyEnabled(globalConfig?.activateMavenRepoDefaultValue)) {
    techUsed.npm = true
  }
  return techUsed
}

export const writePolicyEnum = ['ALLOW', 'ALLOW_ONCE', 'DENY', 'REPLICATION_ONLY'] as const
export type WritePolicy = typeof writePolicyEnum[number]

export function parseWritePolicy(inputTrial?: string): WritePolicy | 'ERROR' {
  const input = inputTrial?.toUpperCase() ?? 'ALLOW'
  return writePolicyEnum.find(policy => policy === input) ?? 'ERROR'
}

export function parseProjectOptions(options: ProjectLite['store']['nexus']) {
  // @ts-expect-error
  const mavenReleaseWritePolicy = parseWritePolicy(options?.mavenReleaseWritePolicy ?? options?.mavenWritePolicy)
  // @ts-expect-error
  const mavenSnapshotWritePolicy = parseWritePolicy(options?.mavenSnapshotWritePolicy ?? options?.mavenWritePolicy)
  const npmWritePolicy = parseWritePolicy(options?.npmWritePolicy)
  const keysInError: (keyof NonNullable<Required<typeof options>>)[] = []
  if (mavenReleaseWritePolicy === 'ERROR') keysInError.push('mavenReleaseWritePolicy')
  if (mavenSnapshotWritePolicy === 'ERROR') keysInError.push('mavenSnapshotWritePolicy')
  if (npmWritePolicy === 'ERROR') keysInError.push('npmWritePolicy')
  return {
    keysInError,
    mavenReleaseWritePolicy,
    mavenSnapshotWritePolicy,
    npmWritePolicy,
  }
}

export function updateStore(store?: ProjectLite['store']['nexus']) {
  if (!store) return {}
  // @ts-expect-error
  if (store.mavenWritePolicy) {
  // @ts-expect-error
    store.mavenReleaseWritePolicy = store.mavenReleaseWritePolicy ?? store.mavenWritePolicy
    // @ts-expect-error
    store.mavenSnapshotWritePolicy = store.mavenSnapshotWritePolicy ?? store.mavenWritePolicy
    // @ts-expect-error
    store.mavenWritePolicy = ''
  }
  return store
}
