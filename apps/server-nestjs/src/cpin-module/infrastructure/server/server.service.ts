import { Injectable } from '@nestjs/common'
import { initServer } from '@ts-rest/fastify'

@Injectable()
// @TODO is this still necessary ?
export class ServerService {
  serverInstance!: any

  constructor() {
    this.serverInstance = initServer()
  }
}
