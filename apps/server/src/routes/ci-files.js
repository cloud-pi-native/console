import { generateCIFiles } from '../generate-ci-files/generate-ci-files.js'

const router = async (app, _opt) => {
  await app.post('/', generateCIFiles)
}

export default router
