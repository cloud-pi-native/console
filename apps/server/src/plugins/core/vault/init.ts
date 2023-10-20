import { RegisterFn } from '@/plugins/index.js'
import { archiveDsoProject, getDsoProjectSecrets } from './index.js'

export const init = (register: RegisterFn) => {
  register('vault', {
    archiveProject: { main: archiveDsoProject }, // Destroy all secrets for project
    getProjectSecrets: { main: getDsoProjectSecrets }, // Only vault operations
  })
}
