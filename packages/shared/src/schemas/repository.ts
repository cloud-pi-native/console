import { z } from 'zod'
import { invalidGitUrl, invalidInternalRepoName, missingCredentials } from '../utils/const.js'
import { ErrorSchema } from './utils.js'

export const RepoSchema = z.object({
  id: z.string()
    .uuid(),
  internalRepoName: z.string()
    .min(2, { message: 'Longueur minimum 2 caractères' })
    .max(20, { message: 'Longueur maximum 20 caractères' })
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: invalidInternalRepoName }),
  externalRepoUrl: z.string()
    .regex(/^https:\/\/.*\.git$/, { message: invalidGitUrl })
    .url({ message: 'Url invalide' })
    .or(z.literal(''))
    .optional(),
  isPrivate: z.boolean(),
  isInfra: z.boolean(),
  externalUserName: z.string()
    .optional(),
  externalToken: z.string()
    .optional(),
  projectId: z.string()
    .uuid(),
})

// To only use in frontend form
export const RepoFormSchema = RepoSchema
  .extend({ isStandalone: z.boolean() })

export const UpdateRepoFormSchema = RepoFormSchema
  .refine(
    ({ isPrivate, externalToken, externalUserName }) => {
      if (isPrivate) {
        if (!externalToken && !externalUserName) return false
        return true
      }
      return true
    },
    { message: missingCredentials, path: ['credentials'] },
  )
  .refine(({ isStandalone, externalRepoUrl }) => {
    if (!isStandalone && !externalRepoUrl) {
      return false
    }
    return true
  }, { message: 'Veuillez renseignez l\'url du dépôt externe', path: ['externalRepoUrl'] })

export const CreateRepoFormSchema = RepoFormSchema
  .omit({ id: true, projectId: true })
  .refine(({ isPrivate, externalToken, externalUserName }) => {
    if (isPrivate) {
      if (!externalToken && !externalUserName) return false
      return true
    }
    return true
  }, { message: missingCredentials, path: ['credentials'] })
  .refine(({ isStandalone, externalRepoUrl }) => {
    if (!isStandalone && !externalRepoUrl) {
      return false
    }
    return true
  }, { message: 'Veuillez renseignez l\'url du dépôt externe', path: ['externalRepoUrl'] })

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
