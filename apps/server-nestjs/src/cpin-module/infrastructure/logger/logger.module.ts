import { Module } from '@nestjs/common';
import { PinoLoggerOptions } from 'fastify/types/logger';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';

export const customLevels = {
    audit: 25,
};

export const loggerConfiguration: Record<string, PinoLoggerOptions> = {
    development: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'dd/mm/yyyy - HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
                singleLine: true,
            },
        },
        customLevels,
        level: process.env.LOG_LEVEL ?? 'debug',
    },
    production: {
        customLevels,
        level: process.env.LOG_LEVEL ?? 'audit',
    },
    test: {
        level: 'silent',
    },
};

@Module({
    imports: [
        PinoLoggerModule.forRootAsync({
            imports: [ConfigurationModule],
            inject: [ConfigurationService],
            useFactory: async (configService: ConfigurationService) => {
                return {
                    pinoHttp: loggerConfiguration[configService.environment],
                };
            },
        }),
    ],
    controllers: [],
    providers: [],
})
export class LoggerModule {}
