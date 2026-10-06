import type { User } from '@prisma/client'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../infrastructure/database/prisma.service'

@Injectable()
export class AuthUserService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException(`Unable to find user ${id}`)
    }
    return user
  }
}
