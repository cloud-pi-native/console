import { ServiceInfos } from '@/plugins/services.js'
import { sonarqubeUrl } from './index.js'

const infos: ServiceInfos = {
  name: 'sonarqube',
  monitorUrl: `${sonarqubeUrl}`,
  to: () => `${sonarqubeUrl}/projects`,
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.svg',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
}

export default infos
