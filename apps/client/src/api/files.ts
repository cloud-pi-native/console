import type { GenerateCIFilesBody } from '@cpn-console/shared'
import { apiClient } from './xhr-client.js'

export const generateCIFiles = async (data: GenerateCIFilesBody) => {
  const response = await apiClient.Files.generateCIFiles({ body: data })
  if (response.status === 201) return response.body
}
