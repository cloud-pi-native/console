import { StepCall } from '@/plugins/hooks/hook.js'
import { api } from './index.js'

export const purgeAll: StepCall<object> = async () => {
  const sonarProjectSearch = await api.projects.list()
  const projectKeys = sonarProjectSearch.map(project => project.key)
  const sonarUserSearch = await api.users.list()

  await api.projects.bulkDelete(projectKeys)
  for (const user of sonarUserSearch) {
    if (user?.groups.some(group => group.startsWith('/'))) {
      await api.users.delete(user.login, true)
    }
  }
  return {
    status: {
      result: 'OK',
      message: 'Sonar projects and users deleted',
    },
  }
}
