import { RegisterFn } from '@/plugins/index.js'
import { archiveDsoProject } from './index.js'
import infos from './infos.js'

export const init = (register: RegisterFn) => {
  register(infos.name, {
    archiveProject: { main: archiveDsoProject }, // Destroy all secrets for project
  })
}
