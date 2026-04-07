import fastifyOtel from '@fastify/otel'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'

const sdk = new NodeSDK({
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({}),
  }),
  serviceName: 'console-pi-native-console',
  traceExporter: new OTLPTraceExporter({}),
  instrumentations: [
    getNodeAutoInstrumentations(),
    new fastifyOtel.FastifyOtelInstrumentation({
      registerOnInitialization: true,
    }),
  ],
})

sdk.start()

process.once('beforeExit', () => {
  sdk.shutdown()
})
