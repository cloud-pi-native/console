import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'

function createSdk() {
  return new NodeSDK({
    traceExporter: new OTLPTraceExporter({}),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
    instrumentations: [
      getNodeAutoInstrumentations(),
      new NestInstrumentation(),
      new PinoInstrumentation(),
    ],
    serviceName: 'cloud-pi-native-console',
  })
}

export function instrument() {
  const sdk = createSdk()
  sdk.start()
  process.on('SIGTERM', () => {
    sdk.shutdown()
  })
}
