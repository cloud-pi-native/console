import type { ClientInferResponseBody } from '@ts-rest/core'
import type { FastifyRequest } from 'fastify'
import { userContract } from '@cpn-console/shared'
import { Body, Controller, Get, Inject, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { UserService } from './user.service'

type AllUsersResponse = ClientInferResponseBody<typeof userContract.getAllUsers, 200>
type MatchingUsersResponse = ClientInferResponseBody<typeof userContract.getMatchingUsers, 200>
type PatchUsersResponse = ClientInferResponseBody<typeof userContract.patchUsers, 200>

@Controller('api/v1/users')
@UseGuards(UserGuard)
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get()
  @RequireAdminPermission('ManageUsers')
  async getAllUsers(
    @Query(new ZodValidationPipe(userContract.getAllUsers.query)) query: typeof userContract.getAllUsers.query._type,
    @Req() _request: FastifyRequest,
  ): Promise<AllUsersResponse> {
    const relationType = query.relationType ?? 'AND'
    const { relationType: _, ...listQuery } = query
    return this.userService.getAllUsers(listQuery, relationType)
  }

  @Get('matching')
  async getMatchingUsers(
    @Query(new ZodValidationPipe(userContract.getMatchingUsers.query)) query: typeof userContract.getMatchingUsers.query._type,
    @Req() _request: FastifyRequest,
  ): Promise<MatchingUsersResponse> {
    return this.userService.getMatchingUsers(query)
  }

  @Patch()
  @RequireAdminPermission('ManageUsers')
  async patchUsers(
    @Body(new ZodValidationPipe(userContract.patchUsers.body)) users: typeof userContract.patchUsers.body._type,
    @Req() _request: FastifyRequest,
  ): Promise<PatchUsersResponse> {
    return this.userService.patchUsers(users)
  }
}
