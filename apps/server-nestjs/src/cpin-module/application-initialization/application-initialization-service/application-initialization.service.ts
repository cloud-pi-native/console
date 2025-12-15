import { DatabaseService } from '@/cpin-module/infrastructure/database/database.service';
import { Injectable, Logger } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ConfigurationService } from 'src/cpin-module/infrastructure/configuration/configuration.service';

import { DatabaseInitializationService } from '../database-initialization/database-initialization.service';
import { PluginManagementService } from '../plugin-management/plugin-management.service';

@Injectable()
export class ApplicationInitializationService {
    private readonly logger = new Logger(ApplicationInitializationService.name);
    constructor(
        private readonly config: ConfigurationService,
        private readonly pluginManagementService: PluginManagementService,
        private readonly databaseInitializationService: DatabaseInitializationService,
        private readonly databaseService: DatabaseService,
    ) {}

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
        await this.databaseInitializationService.initDb(data);
        this.logger.log('initDb invoked successfully');
    }

    async initApp() {
        try {
            await this.databaseService.getConnection();
        } catch (error) {
            this.logger.error(error.message);
            throw error;
        }

        this.pluginManagementService.initPm();

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
}
