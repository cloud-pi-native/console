import { Injectable } from '@nestjs/common';
import { setTimeout } from 'node:timers/promises';

import { logger } from './app.js';
import prisma from './prisma.js';
import { dbUrl, isCI, isDev, isTest } from './utils/env.js';

@Injectable()
export class ConnectionService {
    closingConnections = false;

    async getConnection(triesLeft = 5): Promise<void> {
        if (this.closingConnections || triesLeft <= 0) {
            throw new Error('Unable to connect to Postgres server');
        }
        triesLeft--;

        try {
            if (isDev || isTest || isCI) {
                logger.info(`Trying to connect to Postgres with: ${dbUrl}`);
            }
            await prisma.$connect();

            logger.info('Connected to Postgres!');
        } catch (error) {
            if (triesLeft > 0) {
                logger.error(error);
                logger.info(`Could not connect to Postgres: ${error.message}`);
                logger.info(`Retrying (${triesLeft} tries left)`);
                await setTimeout(isTest || isCI ? 1000 : 10000);
                return this.getConnection(triesLeft);
            }

            logger.info(`Could not connect to Postgres: ${error.message}`);
            logger.info('Out of retries');
            error.message = `Out of retries, last error: ${error.message}`;
            throw error;
        }
    }

    async closeConnections() {
        this.closingConnections = true;
        try {
            await prisma.$disconnect();
        } catch (error) {
            logger.error(error);
        } finally {
            this.closingConnections = false;
        }
    }
}
