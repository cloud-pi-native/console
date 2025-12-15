import { Injectable, Logger } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ConfigurationService } from 'src/cpin-module/infrastructure/configuration/configuration.service';

import app from './app';
import { getConnection } from './connect';
import { initDb } from './init/db/index';
import { initPm } from './plugins';

@Injectable()
export class ApplicationInitializationService {
    private readonly logger = new Logger(ApplicationInitializationService.name);
    constructor(private readonly config: ConfigurationService) {}

    async setUpHTTPProxy() {
        // Workaround because fetch isn't using http_proxy variables
        // See. https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
        if (process.env.HTTP_PROXY) {
            const Undici = await import('undici');
            const ProxyAgent = Undici.ProxyAgent;
            const setGlobalDispatcher = Undici.setGlobalDispatcher;
            setGlobalDispatcher(new ProxyAgent(process.env.HTTP_PROXY));
        }
    }

    async injectDataInDatabase(path: string) {
        this.logger.log('Starting init DB...');
        const { data } = await import(path);
        await initDb(data);
        this.logger.log('initDb invoked successfully');
    }

    async startServer() {
        try {
            await getConnection();
        } catch (error) {
            if (!(error instanceof Error)) return;
            this.logger.error(error.message);
            throw error;
        }

        initPm();

        this.logger.log('Reading init database file');

        try {
            const dataPath =
                this.config.isProd || this.config.isInt
                    ? './init/db/imports/data'
                    : '@cpn-console/test-utils/src/imports/data';
            await this.injectDataInDatabase(dataPath);
            if (this.config.isProd && !this.config.isDevSetup) {
                this.logger.log('Cleaning up imported data file...');
                await rm(resolve(__dirname, dataPath));
                this.logger.log(`Successfully deleted '${dataPath}'`);
            }
        } catch (error) {
            if (
                error.code === 'ERR_MODULE_NOT_FOUND' ||
                error.message.includes('Failed to load') ||
                error.message.includes('Cannot find module')
            ) {
                this.logger.log('No initDb file, skipping');
            } else {
                this.logger.warn(error.message);
                throw error;
            }
        }

        this.logger.debug({
            isDev: this.config.isDev,
            isTest: this.config.isTest,
            isCI: this.config.isCI,
            isDevSetup: this.config.isDevSetup,
            isProd: this.config.isProd,
        });
    }

    async getPreparedApp() {
        try {
            await getConnection();
        } catch (error) {
            this.logger.error(error.message);
            throw error;
        }

        initPm();

        this.logger.log('Reading init database file');

        try {
            const dataPath =
                this.config.isProd || this.config.isInt
                    ? './init/db/imports/data'
                    : '@cpn-console/test-utils/src/imports/data';
            await this.injectDataInDatabase(dataPath);
            if (this.config.isProd && !this.config.isDevSetup) {
                this.logger.log('Cleaning up imported data file...');
                await rm(resolve(__dirname, dataPath));
                this.logger.log(`Successfully deleted '${dataPath}'`);
            }
        } catch (error) {
            if (
                error.code === 'ERR_MODULE_NOT_FOUND' ||
                error.message.includes('Failed to load') ||
                error.message.includes('Cannot find module')
            ) {
                this.logger.log('No initDb file, skipping');
            } else {
                this.logger.warn(error.message);
                throw error;
            }
        }

        this.logger.debug({
            isDev: this.config.isDev,
            isTest: this.config.isTest,
            isCI: this.config.isCI,
            isDevSetup: this.config.isDevSetup,
            isProd: this.config.isProd,
        });
        return app;
    }
}
