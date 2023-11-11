import type { ServiceInfos } from '@/plugins/services.js'
import { projectRootDir } from '@/utils/env.js'
import { gitlabUrl } from './utils.js'
import { getMonitorObject, monitor } from '@/plugins/generic-monitor.js'

const lastMonitor = getMonitorObject()

const infos: ServiceInfos = {
  name: 'gitlab',
  monitor: (currentDate, force) => monitor(gitlabUrl, currentDate, force, lastMonitor),
  to: ({ project, organization }) => `${gitlabUrl}/${projectRootDir}/${organization}/${project}`,
  title: 'Gitlab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
}

export default infos
