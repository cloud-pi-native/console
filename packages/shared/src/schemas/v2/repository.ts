import type Zod from 'zod'
import { z } from 'zod'
import { invalidGitUrl, missingCredentials } from '../../utils/const.js'
import { RepoSchema } from '../repository.js'

// Schémas d'écriture des dépôts pour l'API v2 (server-nestjs). projectId provient
// toujours du chemin, jamais du corps.

// « Parse, don't validate » : collapser le tri-état d'entrée (url | '' | undefined) en
// une valeur exacte `'' | url` dès le boundary. La colonne DB est `String @default("")`
// (non nullable), donc le modèle en aval manipule toujours une chaîne, jamais `undefined`.
const externalRepoUrlSchema = z.string()
  .regex(/^https:\/\/.*\.git$/, { message: invalidGitUrl })
  .url({ message: 'Url invalide' })
  .or(z.literal(''))
  .optional()
  .transform(externalRepoUrl => externalRepoUrl ?? '')

// Champs persistés d'un dépôt, hors credentials et hors caractère privé.
// « Parse, don't validate » : appliquer les défauts de déploiement ArgoCD au boundary
// (une bonne fois), pour que le reste du code manipule des chaînes concrètes plutôt
// qu'un `undefined`/'' à re-défaulter à chaque lecture.
const RepositoryWriteBaseSchema = z.object({
  internalRepoName: RepoSchema.shape.internalRepoName,
  externalRepoUrl: externalRepoUrlSchema,
  isInfra: z.boolean(),
  deployRevision: z.string().optional().transform(deployRevision => deployRevision || 'HEAD'),
  deployPath: z.string().optional().transform(deployPath => deployPath || '.'),
  helmValuesFiles: z.string().default(''),
})

// Union discriminée sur `isPrivate` : dans le type, les credentials sont requis pour
// un dépôt privé et absents d'un dépôt public. Un dépôt public ne peut pas transporter
// de token au-delà du boundary (zod retire les clés inconnues de la branche publique).
export const CreateRepositorySchema = z.discriminatedUnion('isPrivate', [
  RepositoryWriteBaseSchema.extend({
    isPrivate: z.literal(false),
  }),
  RepositoryWriteBaseSchema.extend({
    isPrivate: z.literal(true),
    externalUserName: z.string().min(1, { message: missingCredentials }),
    externalToken: z.string().min(1, { message: missingCredentials }),
  }),
])

// Champs modifiables d'un dépôt (internalRepoName exclu : non modifiable après création).
export const UpdateRepositorySchema = RepoSchema.pick({
  externalRepoUrl: true,
  isPrivate: true,
  externalToken: true,
  externalUserName: true,
  isInfra: true,
  deployRevision: true,
  deployPath: true,
  helmValuesFiles: true,
}).partial()

export const SyncRepositorySchema = z.discriminatedUnion('syncAllBranches', [
  z.object({
    syncAllBranches: z.literal(true),
  }),
  z.object({
    syncAllBranches: z.literal(false),
    branchName: z.string().min(1, { message: 'branchName est requis lorsque syncAllBranches vaut false' }),
  }),
])

export type CreateRepository = Zod.infer<typeof CreateRepositorySchema>
export type UpdateRepository = Zod.infer<typeof UpdateRepositorySchema>
export type SyncRepository = Zod.infer<typeof SyncRepositorySchema>
