import {
  generateCIFiles,
} from '../generateFile/generateCIFiles.js'

const router = async (app, _opt) => {
  await app.post('/', generateCIFiles)
}

export default router
