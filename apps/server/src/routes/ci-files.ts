import { type FastifyInstance } from 'fastify'
import { generateCIFiles } from '../generate-files/generate-ci-files.js'

const router = async (app: FastifyInstance, _opt) => {
  app.put('/', generateCIFiles)
}

export default router
