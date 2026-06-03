import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { AuthenticatedContext } from './authenticated.guard'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../database/prisma.service'
import { USER_TYPES_KEY } from './user-type.decorator'

@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedTypes = this.reflector.getAllAndOverride<string[] | undefined>(
      USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!allowedTypes?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedContext & FastifyRequest>()
    if (typeof request.userId !== 'string') {
      throw new UnauthorizedException()
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { type: true },
    })

    if (!user || !allowedTypes.includes(user.type)) {
      throw new UnauthorizedException('Cannot find requestor in database')
    }

    return true
  }
}
