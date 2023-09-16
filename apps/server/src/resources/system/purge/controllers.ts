import { sendNoContent } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import type { EnhancedFastifyRequest } from '@/types/index.js'
import type { FastifyReply } from 'fastify'
import { purgeAll } from '@/plugins/hooks/index.js'

// TODO revoir
export const purgePlugins = async (req: EnhancedFastifyRequest<void>, res: FastifyReply) => {
  await purgeAll.execute()
  addReqLogs({
    req,
    description: 'Purge des plugins effectué',
  })
  sendNoContent(res)
}
