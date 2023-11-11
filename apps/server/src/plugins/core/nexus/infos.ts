import { ServiceInfos } from '@/plugins/services.js'
import { nexusUrl } from './index.js'
import { getMonitorObject, monitor } from '@/plugins/generic-monitor.js'

const lastMonitor = getMonitorObject()

const infos: ServiceInfos = {
  name: 'nexus',
  // TODO wait for nexus to be connected to oidc
  // to: ({ organization, project }) => `${nexusUrl}/#browse/browse:${organization}-${project}-repository-group`,
  monitor: (currentDate, force) => monitor(nexusUrl, currentDate, force, lastMonitor),
  title: 'Nexus',
  imgSrc: '/img/nexus.png',
  description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
}

export default infos
