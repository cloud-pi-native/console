import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@cpn-console/database'
import { Injectable } from '@nestjs/common'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
