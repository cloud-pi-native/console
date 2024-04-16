import { z } from 'zod'
import { ErrorSchema } from './utils.js'

export const RepoSchema = z.object({
  id: z.string()
    .uuid(),
  internalRepoName: z.string()
    .min(2, { message: 'doit faire minimum 2 caractères' })
    .max(20, { message: 'ne doit pas dépasser 20 caractères' })
    .regex(/^[a-z0-9-]*$/, { message: 'caractères autorisés: a-z, 0-9 et \'-\'' }),
  externalRepoUrl: z.string()
    .regex(/^https:\/\/.*\.git$/, { message: 'doit commencer par https:// et terminer par .git' })
    .url()
    .optional(),
  isPrivate: z.boolean(),
  isInfra: z.boolean(),
  externalUserName: z.string()
    .optional(),
  externalToken: z.string()
    .optional(),
  projectId: z.string()
    .uuid(),
  source: z.enum(['clone', 'autonomous']),
})

const usernameTokenIssue = (path: string) => ({
  path: [path],
  code: z.ZodIssueCode.custom,
  message: 'Veuillez renseignez au minimum un nom d\'utilisateur ou un token.',
})

const externalUrlIssue = {
  code: z.ZodIssueCode.custom,
  message: 'Veuillez renseignez une url source.',
  path: ['externalRepoUrl'],
}

export const CreateRepoBusinessSchema = RepoSchema
  .omit({ id: true, projectId: true })
  .transform((val) => {
    if (val.source !== 'clone') {
      val.isPrivate = false
      delete val.externalRepoUrl
      delete val.externalToken
      delete val.externalUserName
    }
    return val
  })
  .superRefine((val, ctx) => {
    if (val.isPrivate && (!val.externalToken && !val.externalUserName)) {
      ctx.addIssue(usernameTokenIssue('externalUserName'))
      ctx.addIssue(usernameTokenIssue('externalToken'))
    }
    if (val.source === 'clone' && (val.externalRepoUrl === undefined || val.externalRepoUrl.length < 1)) {
      ctx.addIssue(externalUrlIssue)
    }
    return val
  })

export const UpdateRepoBusinessSchema = RepoSchema.partial({
  externalRepoUrl: true,
  externalUserName: true,
  externalToken: true,
}).omit({
  projectId: true,
})
  .transform((val) => {
    if (val.source !== 'clone') {
      val.isPrivate = false
      delete val.externalRepoUrl
      delete val.externalToken
      delete val.externalUserName
    }
    return val
  })
  .superRefine((val, ctx) => {
    if (val.isPrivate && (!val.externalToken && !val.externalUserName)) {
      ctx.addIssue(usernameTokenIssue('externalUserName'))
      ctx.addIssue(usernameTokenIssue('externalToken'))
    }
    if (val.source === 'clone' && (val.externalRepoUrl === undefined || val.externalRepoUrl.length < 1)) {
      ctx.addIssue(externalUrlIssue)
    }
    return val
  })

export type Repo = Zod.infer<typeof RepoSchema>

export const CreateRepoSchema = {
  params: z.object({
    projectId: z.string()
      .uuid(),
  }),
  body: CreateRepoBusinessSchema,
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
  body: UpdateRepoBusinessSchema,
  responses: {
    200: RepoSchema,
    401: ErrorSchema,
    404: ErrorSchema,
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
    401: ErrorSchema,
    404: ErrorSchema,
    500: ErrorSchema,
  },
}
