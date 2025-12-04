import { Injectable } from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';

import { AppService } from './app.js';
import prisma from './prisma.js';
import { dbUrl, isCI, isDev, isTest } from './utils/env.js';

@Injectable()
export class ConnectionService {
    constructor(private readonly appService: AppService) {}

    closingConnections = false;

    async getConnection(triesLeft = 5): Promise<void> {
        if (this.closingConnections || triesLeft <= 0) {
            throw new Error('Unable to connect to Postgres server');
        }
        triesLeft--;

        try {
            if (isDev || isTest || isCI) {
                this.appService.logger.info(
                    `Trying to connect to Postgres with: ${dbUrl}`,
                );
            }
            await prisma.$connect();

            this.appService.logger.info('Connected to Postgres!');
        } catch (error) {
            if (triesLeft > 0) {
                this.appService.logger.error(error);
                this.appService.logger.info(
                    `Could not connect to Postgres: ${error.message}`,
                );
                this.appService.logger.info(
                    `Retrying (${triesLeft} tries left)`,
                );
                await setTimeout(isTest || isCI ? 1000 : 10000);
                return this.getConnection(triesLeft);
            }

            this.appService.logger.info(
                `Could not connect to Postgres: ${error.message}`,
            );
            this.appService.logger.info('Out of retries');
            error.message = `Out of retries, last error: ${error.message}`;
            throw error;
        }
    }

    async closeConnections() {
        this.closingConnections = true;
        try {
            await prisma.$disconnect();
        } catch (error) {
            this.appService.logger.error(error);
        } finally {
            this.closingConnections = false;
        }
    }
}
