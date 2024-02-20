import type { ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './utils.js'

const infos: ServiceInfos = {
  name: 'gitlab',
  to: ({ project, organization }) => `${getConfig().url}/${getConfig().projectsRootDir}/${organization}/${project}`,
  title: 'Gitlab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
}

export default infos
