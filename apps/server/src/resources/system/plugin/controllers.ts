import { sendOk } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { FastifyReply } from 'fastify'
import { repairPluginsBusiness } from './business.js'

// TODO revoir
export const repairPlugins = async (req: EnhancedFastifyRequest<void>, res: FastifyReply) => {
  repairPluginsBusiness(req.session.user.id)
  addReqLogs({
    req,
    description: 'Réparation des plugins en cours',
  })
  sendOk(res, 'Réparation des plugins en cours')
}
