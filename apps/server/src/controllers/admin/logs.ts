import { getAllLogs, countAllLogs } from '../../models/queries/log-queries.js'
import { sendNotFound, sendOk } from '../../utils/response.js'
import { addReqLogs } from '../../utils/logger.js'

export const getAllLogsController = async (req, res) => {
  const { offset, limit } = req.params
  try {
    const logs = await getAllLogs({ offset, limit })

    addReqLogs({
      req,
      description: 'Logs récupérés avec succès',
    })
    sendOk(res, logs)
  } catch (error) {
    const description = 'Echec de la récupération des logs'
    sendNotFound(res, description)
  }
}

export const countAllLogsController = async (req, res) => {
  try {
    const logsLength = await countAllLogs()

    addReqLogs({
      req,
      description: 'Logs comptés avec succès',
    })
    sendOk(res, logsLength)
  } catch (error) {
    const description = 'Echec du comptage des logs'
    sendNotFound(res, description)
  }
}
