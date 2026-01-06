import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service';
import { DatabaseService } from '@/cpin-module/infrastructure/database/database.service';
import { Injectable, Logger } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DatabaseInitializationService } from '../database-initialization/database-initialization.service';
import { PluginManagementService } from '../plugin-management/plugin-management.service';

@Injectable()
export class ApplicationInitializationService {
    private readonly logger = new Logger(ApplicationInitializationService.name);
    constructor(
        private readonly configurationService: ConfigurationService,
        private readonly pluginManagementService: PluginManagementService,
        private readonly databaseInitializationService: DatabaseInitializationService,
        private readonly databaseService: DatabaseService,
    ) {
        this.handleExit();
    }

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
                this.configurationService.isProd ||
                this.configurationService.isInt
                    ? './init/db/imports/data'
                    : '@cpn-console/test-utils/src/imports/data';
            await this.injectDataInDatabase(dataPath);
            if (
                this.configurationService.isProd &&
                !this.configurationService.isDevSetup
            ) {
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
            isDev: this.configurationService.isDev,
            isTest: this.configurationService.isTest,
            isCI: this.configurationService.isCI,
            isDevSetup: this.configurationService.isDevSetup,
            isProd: this.configurationService.isProd,
        });
    }

    async exitGracefully(error?: Error) {
        if (error instanceof Error) {
            this.logger.fatal(error);
        }
        // @TODO Determine if it is necessary, or if we would rather plug ourselves
        // onto NestJS lifecycle, or even if all this is actually necessary
        // at all anymore
        //
        // await app.close();

        this.logger.log('Closing connections...');
        await this.databaseService.closeConnections();
        this.logger.log('Exiting...');
        process.exit(error instanceof Error ? 1 : 0);
    }

    logExitCode(code: number) {
        this.logger.warn(`received signal: ${code}`);
    }

    logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
        this.logger.error({ message: 'Unhandled Rejection', promise, reason });
    }

    handleExit() {
        process.on('exit', this.logExitCode);
        process.on('SIGINT', this.exitGracefully);
        process.on('SIGTERM', this.exitGracefully);
        process.on('uncaughtException', this.exitGracefully);
        process.on('unhandledRejection', this.logUnhandledRejection);
    }
}
