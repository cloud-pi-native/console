import type { ServiceInfos } from '@/plugins/services.js'
import { projectRootDir } from '@/utils/env.js'
import { gitlabUrl } from './utils.js'

const infos: ServiceInfos = {
  name: 'gitlab',
  monitorUrl: `${gitlabUrl}`,
  to: ({ project, organization }) => `${gitlabUrl}/${projectRootDir}/${organization}/${project}`,
  title: 'Gitlab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
}

export default infos
