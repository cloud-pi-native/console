import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const RepoSchema = z.object({
  id: z.string()
    .uuid(),
  internalRepoName: z.string()
    .regex(/^[a-z0-9]+[a-z0-9-]+[a-z0-9]+$/, { message: 'failed regex test' })
    .min(2, { message: 'must be at least 2 character long' })
    .max(20, { message: 'must not exceed 20 characters' }),
  externalRepoUrl: z.string()
    .url()
    .regex(/^https:\/\/.*\.git$/, { message: 'failed regex test' }),
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
  ({ isPrivate, externalToken, externalUserName }) =>
    (isPrivate && externalToken && externalUserName) ||
    !isPrivate,
  { message: 'Si le dépôt est privé, vous devez renseignez les nom de propriétaire et token associés.' },
)

export const RepoBusinessSchema = RepoSchema.refine(
  ({ isPrivate, externalToken, externalUserName }) =>
    (isPrivate && externalToken && externalUserName) ||
    !isPrivate,
  { message: 'Si le dépôt est privé, vous devez renseignez les nom de propriétaire et token associés.' },
)

export type Repo = Zod.infer<typeof RepoSchema>

export const CreateRepoSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  body: RepoSchema.omit({ id: true, projectId: true }),
  responses: {
    201: RepoSchema,
    400: ErrorSchema,
    401: ErrorSchema,
    403: ErrorSchema,
    500: ErrorSchema,
  },
}

export const GetReposSchema = {
  params: z.object({
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
    projectId: z.string()
      .uuid(),
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
    projectId: z.string()
      .uuid(),
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
    projectId: z.string()
      .uuid(),
    repositoryId: z.string()
      .uuid(),
  }),
  body: z.object({
    branchName: z.string(),
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
    projectId: z.string()
      .uuid(),
    repositoryId: z.string()
      .uuid(),
  }),
  responses: {
    204: null,
    500: ErrorSchema,
  },
}
