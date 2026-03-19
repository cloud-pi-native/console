import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SERVICE_NAME } from './telemetry.constants'

@Injectable()
export class TelemetryService extends NodeSDK implements OnModuleInit, OnApplicationShutdown {
  constructor() {
    super({
      traceExporter: new OTLPTraceExporter({}),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
      instrumentations: [
        getNodeAutoInstrumentations(),
        new NestInstrumentation(),
        new PinoInstrumentation(),
      ],
      serviceName: SERVICE_NAME,
    })
  }

  onModuleInit() {
    this.start()
  }

  onApplicationShutdown() {
    this.shutdown()
  }
}
