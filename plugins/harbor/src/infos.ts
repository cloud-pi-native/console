import type { ServiceInfos } from '@cpn-console/hooks'
import { DISABLED } from '@cpn-console/shared'
import getConfig from './config.js'

const quotaDescription = '-1 -> illimité, sinon 100MB / 1.2GB (unités : B, KB, MB, GB, TB)), max 1024TB'
const infos = {
  name: 'registry',
  to: ({ store }) => store?.registry?.projectId ? `${getConfig().publicUrl}/harbor/projects/${store.registry.projectId}` : `${getConfig().publicUrl}/`,
  title: 'Harbor',
  imgSrc: '/img/harbor.svg',
  description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
  config: {
    project: [{
      permissions: {
        admin: { read: false, write: false },
        user: { read: false, write: false },
      },
      key: 'projectId',
      kind: 'text',
      title: 'Num du projet Harbor',
      value: '',
    }, {
      kind: 'switch',
      key: 'publishProjectRobot',
      initialValue: DISABLED,
      title: 'Publication du robot projet',
      description: 'Activer le robot de projet (read-only) et afficher ses identifiants aux utilisateurs',
      permissions: {
        admin: { read: true, write: true },
        user: { read: true, write: false },
      },
      value: DISABLED,
    }, {
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: true, write: false },
      },
      key: 'quotaHardLimit',
      title: 'Quota',
      value: '',
      description: `Stockage limite (vide utilisation du paramètre global, ${quotaDescription}`,
      placeholder: '',
    }],
    global: [{
      kind: 'switch',
      key: 'publishProjectRobot',
      initialValue: DISABLED,
      title: 'Publication du robot RO aux projets',
      description: 'Définit le comportement en l\'absence de ce paramétrage au niveau projet',
      permissions: {
        admin: { read: true, write: true },
        user: { read: true, write: false },
      },
      value: DISABLED,
    }, {
      kind: 'text',
      permissions: {
        admin: { read: true, write: true },
        user: { read: true, write: false },
      },
      key: 'quotaHardLimit',
      title: 'Quota par défaut',
      value: '-1',
      description: `Stockage limite par projet (${quotaDescription}`,
      placeholder: '-1',
    }],
  },
} as const satisfies ServiceInfos

export default infos
