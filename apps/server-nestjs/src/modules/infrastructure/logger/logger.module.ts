import type { ConfigType } from '@nestjs/config'
import { getLoggerOptions } from '@cpn-console/logger'
import { Module } from '@nestjs/common'
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino'
import { baseConfigFactory } from '../../../config/base.config'

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [],
      inject: [baseConfigFactory.KEY],
      useFactory: async (baseConfig: ConfigType<typeof baseConfigFactory>) => {
        return {
          pinoHttp: {
            ...getLoggerOptions(baseConfig.isProd ? 'production' : 'development', baseConfig.isTest ? 'info' : 'debug'),
            customLogLevel: (req, res, err) => {
              if (err || res.statusCode >= 500) {
                return 'error'
              }
              if (res.statusCode >= 400) {
                return 'warn'
              }
              // kube liveness/readiness probes hit healthz constantly, only log it on failure
              if (req.url?.split('?')[0] === '/api/v1/healthz') {
                return 'silent'
              }
              return 'info'
            },
          },
        }
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class LoggerModule {}
