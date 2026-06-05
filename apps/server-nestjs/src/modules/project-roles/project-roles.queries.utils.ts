import type { Prisma } from '@prisma/client'

export const projectRoleWithProjectSelect = {
  id: true,
  name: true,
  permissions: true,
  position: true,
  oidcGroup: true,
  type: true,
  projectId: true,
  project: {
    select: {
      slug: true,
      members: {
        distinct: 'userId',
      },
    },
  },
} satisfies Prisma.ProjectRoleSelect

export const projectRoleForDeleteSelect = {
  type: true,
  projectId: true,
} satisfies Prisma.ProjectRoleSelect

export const projectForRoleContextSelect = {
  id: true,
  slug: true,
  status: true,
  locked: true,
} satisfies Prisma.ProjectSelect

export type ProjectRoleWithProject = Prisma.ProjectRoleGetPayload<{ select: typeof projectRoleWithProjectSelect }>

export type ProjectForRoleContext = Prisma.ProjectRoleGetPayload<{ select: typeof projectForRoleContextSelect }>

export function getProjectBySlug(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: { slug: true } })
}

export function getProjectRoleForDelete(db: Prisma.TransactionClient, roleId: string) {
  return db.projectRole.findUnique({ where: { id: roleId }, select: projectRoleForDeleteSelect })
}

export function getProjectForUpsert(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectForRoleContextSelect })
}
