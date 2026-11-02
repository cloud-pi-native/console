import type { ExperimentalFeatureRequest, ExperimentalFeatureScope } from '@cpn-console/shared'
import type { UserContext } from '../../infrastructure/auth/auth-user.decorator'
import { ExperimentalFeatureRequestSchema, ExperimentalFeatureScopeSchema } from '@cpn-console/shared'
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthUser } from '../../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../../infrastructure/pipe/zod-validation.pipe'
import { ExperimentalFeatureService } from './experimental-feature.service'
import { toExperimentalFeatureTarget } from './experimental-feature.utils'

@Controller('api/v1/experimental-features/opencds')
@UseGuards(UserGuard)
export class ExperimentalFeatureController {
  constructor(@Inject(ExperimentalFeatureService) private readonly service: ExperimentalFeatureService) {}

  @Get()
  @RequireAdminPermission('ListSystem')
  async list() {
    return (await this.service.list()).map(toExperimentalFeatureTarget)
  }

  @Post('authorizations')
  @RequireAdminPermission('ManageSystem')
  async authorize(
    @Body(new ZodValidationPipe(ExperimentalFeatureScopeSchema)) scope: ExperimentalFeatureScope,
    @AuthUser() user: UserContext,
  ) {
    return toExperimentalFeatureTarget(await this.service.authorize(scope, user.userId))
  }

  @Patch(':id/request')
  @RequireAdminPermission('ManageSystem')
  async request(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ExperimentalFeatureRequestSchema)) body: ExperimentalFeatureRequest,
    @AuthUser() user: UserContext,
  ) {
    return toExperimentalFeatureTarget(await this.service.request(id, body, user.userId))
  }
}
