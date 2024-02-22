import { z } from 'zod'
// import { AllStatus } from '../index.js'

export const CreateRepoSchema = z.object({
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
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  externalToken: z.string()
    .regex(/^[a-zA-Z0-9=_-]+$/)
    .optional(),
})

const UpdateRepoSchema = z.object({
  id: z.string()
    .uuid(),
  status: z.string(),
  // status: z.nativeEnum(AllStatus),
  projectId: z.string()
    .uuid(),
})

const RepoSchema = UpdateRepoSchema.merge(CreateRepoSchema)

export const CreateRepoBusinessSchema = CreateRepoSchema.refine(
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
