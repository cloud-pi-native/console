import { generateCIFiles } from '../generate-files/generate-ci-files.js'

const router = async (app, _opt) => {
  await app.post('/', generateCIFiles)
}

export default router
