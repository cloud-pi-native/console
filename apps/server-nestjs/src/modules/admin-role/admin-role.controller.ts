import type { AdminRole } from '@cpn-console/shared'
import { adminRoleContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { AdminRoleService } from './admin-role.service'

@Controller('api/v1/admin/roles')
export class AdminRoleController {
  constructor(
    @Inject(AdminRoleService) private readonly adminRoleService: AdminRoleService,
  ) {}

  @Get('')
  @UseGuards(UserGuard)
  // TODO: ListRoles is intentionally not protected by admin permission because of
  // certain behaviours of the legacy client
  // @RequireAdminPermission('ListRoles')
  async listAdminRoles(): Promise<AdminRole[]> {
    return this.adminRoleService.list()
  }

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageRoles')
  async createAdminRole(
    @Body(new ZodValidationPipe(adminRoleContract.createAdminRole.body)) body: typeof adminRoleContract.createAdminRole.body._type,
  ): Promise<AdminRole> {
    return this.adminRoleService.create(body)
  }

  @Patch('')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageRoles')
  async patchAdminRoles(
    @Body(new ZodValidationPipe(adminRoleContract.patchAdminRoles.body)) body: typeof adminRoleContract.patchAdminRoles.body._type,
  ): Promise<AdminRole[]> {
    return this.adminRoleService.patch(body)
  }

  @Get('member-counts')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageRoles')
  async adminRoleMemberCounts(): Promise<Record<string, number>> {
    return this.adminRoleService.memberCounts()
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageRoles')
  async deleteAdminRole(
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    await this.adminRoleService.delete(roleId)
  }
}
