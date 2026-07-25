import type { DynamicModule } from '@nestjs/common'
import { ConfigurableModuleBuilder } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

// Minimal shape of the generated configurable class, so consumers (e.g. `XModule.forRoot(...)`)
// see the `forRoot` static method. The arg is `TOptions` (plain object, for tests) OR a
// `ConfigFactory` (e.g. `registerAs('<module>', ...)`), whose `.asProvider()` is wired by
// `forRoot` into this module's options token.
export interface ConfigurableCls<TOptions> {
  new(...args: any[]): any
  forRoot: (arg: TOptions | any) => DynamicModule
}

// Builds a configurable module that OWNS its config contract (interface embedded in-module,
// no ../../config / registerAs dependency inside the module). The module is wired from the
// outside via `XModule.forRoot(xxxConfigFactory)`, where `xxxConfigFactory` is the
// `registerAs('<module>', ...)` result from `config/*.config.ts`. `<module>` MUST equal
// `token` so `ConfigModule.forFeature` registers it under `CONFIGURATION(<token>)`.
// `isGlobal` makes the module (and its config token) available app-wide via @Global().
// ponytail: native forRoot only takes a plain options object; we wrap it so it also accepts
// a `ConfigFactory` and wires it (via ConfigModule.forFeature + a provider under the token).
function isConfigFactory(arg: unknown): boolean {
  return typeof arg === 'function' && 'asProvider' in (arg as any)
    && typeof (arg as any).asProvider === 'function'
}

function isConfigProvider(arg: unknown): arg is { provide: unknown, useFactory?: unknown, useValue?: unknown } {
  return Boolean(arg) && typeof arg === 'object'
    && 'provide' in (arg as Record<string, unknown>)
    && ('useFactory' in (arg as Record<string, unknown>) || 'useValue' in (arg as Record<string, unknown>))
}

export function createConfigurableModule<TOptions>(token: string, isGlobal = false) {
  const { ConfigurableModuleClass } = new ConfigurableModuleBuilder<TOptions>({ optionsInjectionToken: token })
    .setClassMethodName('forRoot')
    .setFactoryMethodName('useFactory')
    .setExtras(
      { isGlobal },
      (definition: DynamicModule, extras) => ({
        ...definition,
        exports: [...(definition.exports ?? []), token],
        global: extras.isGlobal,
      }),
    )
    .build()

  class WrappedModuleClass extends (ConfigurableModuleClass as any) {
    static forRoot(arg: any): DynamicModule {
      const def = (super.forRoot as (o: unknown) => DynamicModule)({}) as DynamicModule
      if (isConfigFactory(arg)) {
        const provider = (arg as any).asProvider()
        return {
          ...def,
          imports: [(ConfigModule as any).forFeature(arg), ...(def.imports ?? [])],
          providers: [
            ...(def.providers ?? []),
            { provide: token, useFactory: provider.useFactory, inject: provider.inject },
          ],
          exports: [...(def.exports ?? []), token],
        }
      }
      if (isConfigProvider(arg)) {
        const provider = arg as any
        return {
          ...def,
          providers: [...(def.providers ?? []), provider],
          exports: [...(def.exports ?? []), provider.provide],
        }
      }
      return (super.forRoot as (o: unknown) => DynamicModule)(arg)
    }
  }

  return {
    ConfigurableModuleClass: WrappedModuleClass as unknown as ConfigurableCls<TOptions>,
    MODULE_OPTIONS_TOKEN: token,
  }
}
