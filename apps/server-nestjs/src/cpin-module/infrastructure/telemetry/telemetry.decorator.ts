import { SpanStatusCode, trace } from '@opentelemetry/api'
import type { Attributes, SpanOptions, Span as OpenTelemetrySpan } from '@opentelemetry/api'
import { TELEMETRY_TRACER_NAME } from './telemetry.constants'

export interface TelemetrySpanMetadata {
  options?: SpanOptions
  attributes?: Attributes
}

export function Span(name?: string, metadata: TelemetrySpanMetadata = {}): MethodDecorator {
  return <T>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> => {
    const original = descriptor.value
    if (typeof original !== 'function') return descriptor

    descriptor.value = function (this: unknown, ...args: unknown[]): unknown {
      const tracer = trace.getTracer(TELEMETRY_TRACER_NAME)
      const className = (this as any)?.constructor?.name ?? 'Unknown'
      const spanName = name ?? `${className}.${String(propertyKey)}`

      return tracer.startActiveSpan(spanName, metadata.options ?? {}, (span) => {
        if (metadata.attributes) span.setAttributes(metadata.attributes)

        try {
          const result = original.apply(this, args)
          if (result instanceof Promise) {
            return handlePromiseResult(span, result)
          }
          span.end()
          return result
        } catch (error) {
          recordError(span, error)
          span.end()
          throw error
        }
      })
    } as T

    return descriptor
  }
}

async function handlePromiseResult(span: OpenTelemetrySpan, promise: Promise<unknown>): Promise<unknown> {
  try {
    return await promise
  } catch (error) {
    recordError(span, error)
    throw error
  } finally {
    span.end()
  }
}

function recordError(span: OpenTelemetrySpan, error: unknown): void {
  // If it's an actual Error object, OpenTelemetry captures the stack trace automatically
  if (error instanceof Error) {
    span.recordException(error)
  } else {
    span.recordException(String(error))
  }
  span.setStatus({ code: SpanStatusCode.ERROR })
}
