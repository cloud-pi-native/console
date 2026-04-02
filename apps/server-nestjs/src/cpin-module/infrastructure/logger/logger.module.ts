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
      useFactory: async (_configService: ConfigurationService) => {
        return {
          pinoHttp: getLoggerOptions(),
        }
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class LoggerModule {}
