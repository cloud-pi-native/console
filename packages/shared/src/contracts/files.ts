import { z } from 'zod'
import { apiPrefix, contractInstance } from '../api-client.js'
import { ErrorSchema } from '../schemas/utils.js'

export const filesContract = contractInstance.router({
  generateCIFiles: {
    method: 'POST',
    path: `${apiPrefix}/ci-files`,
    summary: 'Generate ci files',
    description: 'Generate ci files.',
    body: z.object({
      typeLanguage: z.string(),
      isJava: z.boolean().optional(),
      isNode: z.boolean().optional(),
      isPython: z.boolean().optional(),
      artefactDir: z.string().optional(),
      internalRepoName: z.string().optional(),
      javaVersion: z.string().optional(),
      nodeBuildCommand: z.string().optional(),
      nodeInstallCommand: z.string().optional(),
      nodeVersion: z.string().optional(),
      projectName: z.string().optional(),
      workingDir: z.string().optional(),
    }),
    responses: {
      201: z.object({}),
      500: ErrorSchema,
    },
  },
})
