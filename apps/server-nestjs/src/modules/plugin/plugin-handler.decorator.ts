import type { PluginName, PluginResults } from './plugin.utils'
import { Logger } from '@nestjs/common'

/**
 * Wraps an `@OnEvent` handler so it always resolves with a `PluginResults` object
 * instead of throwing: the handler's outcome (status, message, execution time and
 * error, if any) is reported under the given plugin name so the emitter can merge
 * and persist the results of every listener.
 *
 * The handler keeps its natural shape: do the work, throw on failure, optionally
 * return a message string to override the default 'Up to date'. Any other return
 * type is rejected at compile time.
 *
 * Place it between `@OnEvent` and `@StartActiveSpan`: decorators apply bottom-up,
 * so the span must wrap the original method (to record the exception and set the
 * ERROR status on failure) while this decorator wraps the span and converts the
 * rethrown error into a KO result.
 */
export function PluginHandler(plugin: PluginName) {
  return <Args extends unknown[], Message extends string | void>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<Message>>,
  ): void => {
    const original = descriptor.value
    if (!original) return

    const logger = new Logger(target.constructor.name)

    const wrapped = async function (this: unknown, ...args: Args): Promise<PluginResults> {
      const start = process.hrtime.bigint()
      const elapsedMs = () => Number(process.hrtime.bigint() - start) / 1_000_000

      try {
        const message = await original.apply(this, args)
        return {
          [plugin]: {
            status: 'OK',
            message: typeof message === 'string' ? message : 'Up to date',
            executionTime: elapsedMs(),
          },
        }
      } catch (error: unknown) {
        logger.error(`${plugin} handler ${String(propertyKey)} failed`, error)
        return {
          [plugin]: {
            status: 'KO',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
            executionTime: elapsedMs(),
            error,
          },
        }
      }
    }

    // Decorators cannot change a method's declared type, so the wrapper (which
    // returns PluginResults instead of Message) is not assignable to the typed
    // descriptor. Mutate through PropertyDescriptor, whose `value` is untyped.
    const mutable: PropertyDescriptor = descriptor
    mutable.value = wrapped
  }
}
