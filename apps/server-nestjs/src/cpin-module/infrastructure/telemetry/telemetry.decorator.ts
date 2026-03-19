import type { Span as OpenTelemetrySpan, SpanOptions } from '@opentelemetry/api'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { TRACER_NAME } from './telemetry.constants'

export type TypedMethodDecorator = <T extends (this: any, ...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void

export function StartActiveSpan(options?: SpanOptions): TypedMethodDecorator {
  return <T extends (this: any, ...args: any[]) => any>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): void => {
    const original = descriptor.value
    if (!original) return

    descriptor.value = function (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
      const tracer = trace.getTracer(TRACER_NAME)
      const className = this?.constructor?.name ?? 'Unknown'
      const spanName = `${className}.${String(propertyKey)}`

      const runInActiveSpan = (span: OpenTelemetrySpan) => {
        try {
          const result = original.apply(this, args)

          if (isPromiseLike(result)) {
            return handlePromiseResult(span, result) as ReturnType<T>
          }

          span.end()
          return result
        } catch (error) {
          recordException(span, error)
          span.end()
          throw error
        }
      }

      if (options) {
        return tracer.startActiveSpan(spanName, options, runInActiveSpan) as ReturnType<T>
      }
      return tracer.startActiveSpan(spanName, runInActiveSpan) as ReturnType<T>
    } as T
  }
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  if (!value) return false
  return typeof (value as Promise<T>).then === 'function'
}

async function handlePromiseResult<T>(span: OpenTelemetrySpan, promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    recordException(span, error)
    throw error
  } finally {
    span.end()
  }
}

function recordException(span: OpenTelemetrySpan, error: unknown): void {
  // If it's an actual Error object, OpenTelemetry captures the stack trace automatically
  if (error instanceof Error) {
    span.recordException(error)
  } else {
    span.recordException(String(error))
  }
  span.setStatus({ code: SpanStatusCode.ERROR })
}
