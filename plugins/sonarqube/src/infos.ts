import { ServiceInfos } from '@cpn-console/hooks'
import { getConfig } from './tech.js'

const infos: ServiceInfos = {
  name: 'sonarqube',
  to: () => `${getConfig().url}/projects`,
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.svg',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
}

export default infos
