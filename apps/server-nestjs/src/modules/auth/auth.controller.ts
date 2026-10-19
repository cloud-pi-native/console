import type { User } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { toContractUser } from '../user/user.utils'
import { AuthUserService } from './auth.service'

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(AuthUserService) private readonly authUserService: AuthUserService) {}

  @Get()
  @UseGuards(UserGuard)
  async auth(@AuthUser() user: UserContext): Promise<User> {
    const contractUser = toContractUser(await this.authUserService.getUser(user.userId))
    return user.adminRoleIds === undefined
      ? contractUser
      : { ...contractUser, adminRoleIds: user.adminRoleIds }
  }
}
