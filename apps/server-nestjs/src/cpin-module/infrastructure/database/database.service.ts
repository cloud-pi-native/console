import prisma from '@/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';

import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class DatabaseService {
    constructor(
        private readonly configurationService: ConfigurationService,
        private readonly loggerService = new Logger(DatabaseService.name),
    ) {
        this.DELAY_BEFORE_RETRY =
            this.configurationService.isTest || this.configurationService.isCI
                ? 1000
                : 10000;
    }
    DELAY_BEFORE_RETRY!: number;
    closingConnections = false;

    async getConnection(triesLeft = 5): Promise<void> {
        if (this.closingConnections || triesLeft <= 0) {
            throw new Error('Unable to connect to Postgres server');
        }
        triesLeft--;

        try {
            if (
                this.configurationService.isDev ||
                this.configurationService.isTest ||
                this.configurationService.isCI
            ) {
                this.loggerService.log(
                    `Trying to connect to Postgres with: ${this.configurationService.dbUrl}`,
                );
            }
            await prisma.$connect();

            this.loggerService.log('Connected to Postgres!');
        } catch (error) {
            if (triesLeft > 0) {
                this.loggerService.error(error);
                this.loggerService.log(
                    `Could not connect to Postgres: ${error.message}`,
                );
                this.loggerService.log(`Retrying (${triesLeft} tries left)`);
                await setTimeout(this.DELAY_BEFORE_RETRY);
                return this.getConnection(triesLeft);
            }

            this.loggerService.log(
                `Could not connect to Postgres: ${error.message}`,
            );
            this.loggerService.log('Out of retries');
            error.message = `Out of retries, last error: ${error.message}`;
            throw error;
        }
    }

    async closeConnections() {
        this.closingConnections = true;
        try {
            await prisma.$disconnect();
        } catch (error) {
            this.loggerService.error(error);
        } finally {
            this.closingConnections = false;
        }
    }
}
