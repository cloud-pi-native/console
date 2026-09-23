import type { AllUsers, LettersQuery, MatchingUsers, PatchUsers, PatchUsersBody } from '@cpn-console/shared'
import type { z } from 'zod'
import { AllUsersQuerySchema, MatchingUsersQuerySchema, PatchUsersBodySchema } from '@cpn-console/shared'
import { Body, Controller, Get, Inject, Patch, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { UserService } from './user.service'
import { toContractUser } from './user.utils'

@Controller('api/v1/users')
@UseGuards(UserGuard)
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get()
  @RequireAdminPermission('ManageUsers')
  async getAllUsers(
    @Query(new ZodValidationPipe(AllUsersQuerySchema)) query: z.infer<typeof AllUsersQuerySchema>,
  ): Promise<AllUsers> {
    const relationType = query.relationType ?? 'AND'
    const { relationType: _, ...listQuery } = query
    const users = await this.userService.getAllUsers(listQuery, relationType)
    return users.map(toContractUser)
  }

  @Get('matching')
  async getMatchingUsers(
    @Query(new ZodValidationPipe(MatchingUsersQuerySchema)) query: LettersQuery,
  ): Promise<MatchingUsers> {
    const users = await this.userService.getMatchingUsers(query)
    return users.map(toContractUser)
  }

  @Patch()
  @RequireAdminPermission('ManageUsers')
  async patchUsers(
    @Body(new ZodValidationPipe(PatchUsersBodySchema)) users: PatchUsersBody,
  ): Promise<PatchUsers> {
    const updatedUsers = await this.userService.patchUsers(users)
    return updatedUsers.map(toContractUser)
  }
}
