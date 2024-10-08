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
