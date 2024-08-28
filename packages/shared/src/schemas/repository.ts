import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const RepoSchema = z.object({
  id: z.string()
    .uuid(),
  internalRepoName: z.string()
    .min(2, { message: 'Longueur minimum 2 caractères' })
    .max(20, { message: 'Longueur maximum 2 caractères' })
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: 'Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique' }),
  externalRepoUrl: z.string()
    .regex(/^https:\/\/.*\.git$/, { message: 'L\'adresse doit commencer par https et se terminer par .git' })
    .url({ message: 'Url invalide' }),
  isPrivate: z.boolean(),
  isInfra: z.boolean(),
  externalUserName: z.string()
    .optional()
    .nullable(),
  externalToken: z.string()
    .optional(),
  projectId: z.string()
    .uuid(),
})

export const CreateRepoBusinessSchema = RepoSchema.omit({ id: true, projectId: true }).refine(
  ({ isPrivate, externalToken, externalUserName }) => {
    if (isPrivate) {
      if (!externalToken && !externalUserName) return false
      return true
    }
    return true
  },
  { message: 'Si le dépôt est privé, vous devez renseignez au moins le nom d\'utilisateur ou le token' },
)

export const RepoBusinessSchema = RepoSchema

export type Repo = Zod.infer<typeof RepoSchema>

export const CreateRepoSchema = {
  body: RepoSchema.omit({ id: true }),
  responses: {
    201: RepoSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetReposSchema = {
  query: z.object({
    projectId: z.string()
      .uuid(),
  }),
  responses: {
    200: z.array(RepoSchema),
    500: ErrorSchema,
  },
}

export const GetRepoByIdSchema = {
  params: z.object({
    repositoryId: z.string()
      .uuid(),
  }),
  responses: {
    200: RepoSchema,
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}

export const UpdateRepoSchema = {
  params: z.object({
    repositoryId: z.string()
      .uuid(),
  }),
  body: RepoSchema.partial(),
  responses: {
    200: RepoSchema,
    500: ErrorSchema,
  },
}

export const SyncRepoSchema = {
  params: z.object({
    repositoryId: z.string()
      .uuid(),
  }),
  body: z.object({
    syncAllBranches: z.boolean(),
    branchName: z.string().optional(),
  }),
  responses: {
    204: null,
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const DeleteRepoSchema = {
  params: z.object({
    repositoryId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
