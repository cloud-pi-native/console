import type { FastifyRequest } from 'fastify'
import type { ProjectRequirements } from './project-loader.utils'
import type { ProjectContext } from './project.guard'
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { isUuid, makeProjectSelect, resolveProjectPermissions } from './project-loader.utils'

type RequestWithProjectParams = FastifyRequest<{ Params?: ProjectParams }>

interface ProjectParams {
  projectId?: string
  projectSlug?: string
}

@Injectable()
export class ProjectLoaderService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async load(request: RequestWithProjectParams, userId: string, requirements?: ProjectRequirements): Promise<ProjectContext> {
    let where: { id: string } | { slug: string }
    if (request.params?.projectId) {
      where = isUuid(request.params.projectId) ? { id: request.params.projectId } : { slug: request.params.projectId }
    } else if (request.params?.projectSlug) {
      where = { slug: request.params.projectSlug }
    } else {
      throw new BadRequestException('projectId or projectSlug is required')
    }

    const raw = await this.prisma.project.findUnique({
      where,
      select: makeProjectSelect(requirements),
    })
    if (!raw) throw new NotFoundException('Projet introuvable')

    const project: ProjectContext = {
      id: raw.id,
      slug: raw.slug,
    }

    if (requirements?.includeStatus) {
      project.status = raw.status
    }
    if (requirements?.includeLocked) {
      project.locked = raw.locked
    }
    if (requirements?.includePermissions) {
      project.projectPermissions = resolveProjectPermissions(raw, userId)
    }

    return project
  }
}
