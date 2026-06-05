import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Project } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { ProjectRequirements } from './project-loader.service'
import type { ProjectPolicyConfig } from './project.policy'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ProjectLoaderService } from './project-loader.service'
import { ProjectPolicy } from './project.policy'
import { ProjectService } from './project.service'

export interface ProjectContext {
  id: string
  slug: string
  locked?: boolean
  status?: Project['status']
  projectPermissions?: bigint
}

export interface RequestWithProjectContext extends FastifyRequest {
  project?: ProjectContext
}

type RequestWithUserContext = FastifyRequest & {
  userId?: string
  adminPermissions?: bigint
}

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(ProjectPolicy) private readonly projectPolicy: ProjectPolicy,
    @Inject(ProjectLoaderService) private readonly loader: ProjectLoaderService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.projectPolicy.build(context)
    const request = context.switchToHttp().getRequest<
      RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }>
    >()
    const userId = request.userId
    if (typeof userId !== 'string') {
      throw new UnauthorizedException('User ID not available')
    }
    const adminPermissions = request.adminPermissions ?? 0n

    const requirements = makeProjectRequirements(policy)
    request.project = await this.loader.load(request, userId, requirements)

    this.projectService.validate(policy, request.project, { userId, adminPermissions })

    return true
  }
}

function makeProjectRequirements(policy: ProjectPolicyConfig): ProjectRequirements {
  return {
    includeStatus: policy.projectStatuses.length > 0,
    includeLocked: policy.projectLocked !== undefined,
    includePermissions: policy.projectPermissions.length > 0,
  }
}
