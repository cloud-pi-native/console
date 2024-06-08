import type { GenerateCIFilesBody } from '@cpn-console/shared'
import { apiClient, extractData } from './xhr-client.js'

export const generateCIFiles = (data: GenerateCIFilesBody) =>
  apiClient.Files.generateCIFiles({ body: data })
    .then(response => extractData(response, 201))
