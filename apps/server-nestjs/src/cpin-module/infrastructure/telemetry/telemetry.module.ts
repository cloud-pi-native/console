import { Module } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { TelemetryService } from './telemetry.service'
import { TELEMETRY_TRACER, TELEMETRY_TRACER_NAME } from './telemetry.types'

@Module({
  providers: [
    TelemetryService,
    {
      provide: TELEMETRY_TRACER,
      useFactory: () => trace.getTracer(TELEMETRY_TRACER_NAME),
    },
  ],
  exports: [TelemetryService, TELEMETRY_TRACER],
})
export class TelemetryModule {}
