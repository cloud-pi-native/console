import { getLoggerOptions } from '@cpn-console/logger'
import { Module } from '@nestjs/common'
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino'

import { ConfigurationModule } from '../configuration/configuration.module'
import { ConfigurationService } from '../configuration/configuration.service'

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (configService: ConfigurationService) => {
        return {
          pinoHttp: {
            ...getLoggerOptions(configService.isProd ? 'production' : 'development', configService.isTest ? 'info' : 'debug'),
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
