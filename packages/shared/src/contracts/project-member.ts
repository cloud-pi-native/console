import { z } from 'zod'
import { MemberSchema, apiPrefix, contractInstance } from '../index.js'
import { ErrorSchema, baseHeaders } from './_utils.js'

export const projectMemberContract = contractInstance.router({
  listMembers: {
    method: 'GET',
    path: `${apiPrefix}/projects/:projectId/members`,
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      200: MemberSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  addMember: {
    method: 'POST',
    path: `${apiPrefix}/projects/:projectId/members`,
    body: z.object({ email: z.string() }).or(z.object({ userId: z.string() })),
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      201: MemberSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  patchMembers: {
    method: 'PATCH',
    path: `${apiPrefix}/projects/:projectId/members`,
    body: z.object({
      userId: z.string().uuid(),
      roles: z.string().uuid().array(),
    }).array(),
    pathParams: z.object({ projectId: z.string().uuid() }),
    responses: {
      200: MemberSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
  removeMember: {
    method: 'DELETE',
    path: `${apiPrefix}/projects/:projectId/members/:userId`,
    pathParams: z.object({
      projectId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
    body: null,
    responses: {
      204: MemberSchema.array(),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
    },
  },
}, {
  baseHeaders,
})
