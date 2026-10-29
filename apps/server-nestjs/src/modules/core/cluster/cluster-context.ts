import type { PrismaService } from '../../infrastructure/database/prisma.service'
import type { AppEventsService } from '../events/app-events.service'
import { Context, Layer } from 'effect'

// Nest providers exposed as Effect services: module effects declare them in
// the R channel; the controller builds the layer from its @Inject-ed instances.
export class Prisma extends Context.Service<Prisma, PrismaService>()('cloud-pi-native/server-nestjs/core/cluster/Prisma') {}

export class AppEvents extends Context.Service<AppEvents, AppEventsService>()('cloud-pi-native/server-nestjs/core/cluster/AppEvents') {}

export function makeClusterLayer(prisma: PrismaService, appEvents: AppEventsService) {
  return Layer.mergeAll(
    Layer.succeed(Prisma, prisma),
    Layer.succeed(AppEvents, appEvents),
  )
}
