import { z } from 'zod'
import type Zod from 'zod'
import { invalidGitUrl, invalidInternalRepoName, missingCredentials, forbiddenRepoNames } from '../utils/const.js'
import { AtDatesToStringExtend } from './_utils.js'

export const RepoSchema = z.object({
  id: z.string()
    .uuid(),
  internalRepoName: z.string()
    .min(2, { message: 'Longueur minimum 2 caractères' })
    .max(20, { message: 'Longueur maximum 20 caractères' })
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: invalidInternalRepoName })
    .refine(name => !forbiddenRepoNames.includes(name.toLowerCase()), {
      message: `Le nom du dépôt choisi est inclus dans la liste d'exclusion: ${forbiddenRepoNames.join(', ')}`,
    }),
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
}).extend(AtDatesToStringExtend)

// To only use in frontend form
export const RepoFormSchema = RepoSchema
  .omit({ createdAt: true, updatedAt: true })
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
