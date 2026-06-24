import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Project } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../../auth/auth.service'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { AuthService } from '../../auth/auth.service'
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
  userType?: string
}

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

@Injectable()
export class ProjectGuard implements CanActivate {
  private readonly logger = new Logger(ProjectGuard.name)

  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(ProjectLoaderService) private readonly loader: ProjectLoaderService,
    @Inject(ProjectPolicy) private readonly projectPolicy: ProjectPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.projectPolicy.build(context)
    const request = this.getRequest(context)
    const user = await this.authenticate(request)
    const project = await this.loadProject(request, user.userId)

    this.projectService.validate(policy, project, user)

    return true
  }

  private getRequest(context: ExecutionContext): RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }> {
    return context.switchToHttp().getRequest<
      RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }>
    >()
  }

  private async authenticate(
    request: RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }>,
  ): Promise<UserContext> {
    try {
      const user = await this.authService.authenticate(request, {
        includeAdminRoleIds: true,
        includeUserType: true,
      })

      request.userId = user.userId
      if (user.adminPermissions !== undefined) request.adminPermissions = user.adminPermissions
      if (user.userType !== undefined) request.userType = user.userType

      return user
    } catch (error) {
      this.logger.warn(`Project access auth rejected (requestId=${request.id}, error=${error instanceof Error ? error.message : String(error)})`)
      throw error
    }
  }

  private async loadProject(
    request: RequestWithProjectContext & RequestWithUserContext & FastifyRequest<{ Params?: ProjectParams }>,
    userId: string,
  ): Promise<ProjectContext> {
    const project = await this.loader.load(request, userId, {
      includeStatus: true,
      includeLocked: true,
      includePermissions: true,
    })
    request.project = project
    return project
  }
}
