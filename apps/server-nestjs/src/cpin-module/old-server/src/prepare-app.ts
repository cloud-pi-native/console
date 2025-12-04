import { Injectable } from '@nestjs/common';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

import { AppService } from './app';
import { ConnectionService } from './connect';
import { InitDBService } from './init/db';
import { initPm } from './plugins';
import { isCI, isDev, isDevSetup, isProd, isTest } from './utils/env';

@Injectable()
export class PrepareAppService {
    constructor(
        private readonly appService: AppService,
        private readonly connectionService: ConnectionService,
        private readonly initDBService: InitDBService,
    ) {
        // Workaround because fetch isn't using http_proxy variables
        // See. https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
        if (process.env.HTTP_PROXY) {
            setGlobalDispatcher(new ProxyAgent(process.env.HTTP_PROXY));
        }
    }

    async initializeDB(path: string) {
        this.appService.logger.info('Starting init DB...');
        const { data } = await import(path);
        await this.initDBService.initDb(data);
        this.appService.logger.info('initDb invoked successfully');
    }

    async startServer() {
        try {
            await this.connectionService.getConnection();
        } catch (error) {
            if (!(error instanceof Error)) return;
            this.appService.logger.error(error.message);
            throw error;
        }

        initPm();

        this.appService.logger.info('Reading init database file');

        // try {
        // const dataPath =
        // isProd || isInt
        // ? './init/db/imports/data.js'
        // : '@cpn-console/test-utils/src/imports/data.ts';
        // await initializeDB(dataPath);
        // if (isProd && !isDevSetup) {
        // this.appService.logger.info('Cleaning up imported data file...');
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        // await rm(resolve(__dirname, dataPath));
        // this.appService.logger.info(`Successfully deleted '${dataPath}'`);
        // }
        // } catch (error) {
        // if (
        // error.code === 'ERR_MODULE_NOT_FOUND' ||
        // error.message.includes('Failed to load') ||
        // error.message.includes('Cannot find module')
        // ) {
        // this.appService.logger.info('No initDb file, skipping');
        // } else {
        // this.appService.logger.warn(error.message);
        // throw error;
        // }
        // }

        this.appService.logger.debug({
            isDev,
            isTest,
            isCI,
            isDevSetup,
            isProd,
        });
    }

    async getPreparedApp() {
        try {
            await this.connectionService.getConnection();
        } catch (error) {
            this.appService.logger.error(error.message);
            throw error;
        }

        initPm();

        this.appService.logger.info('Reading init database file');

        // try {
        // const dataPath =
        // isProd || isInt
        // ? './init/db/imports/data.js'
        // : '@cpn-console/test-utils/src/imports/data.ts';
        // await initializeDB(dataPath);
        // if (isProd && !isDevSetup) {
        // this.appService.logger.info('Cleaning up imported data file...');
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = dirname(__filename);
        // await rm(resolve(__dirname, dataPath));
        // this.appService.logger.info(`Successfully deleted '${dataPath}'`);
        // }
        // } catch (error) {
        // if (
        // error.code === 'ERR_MODULE_NOT_FOUND' ||
        // error.message.includes('Failed to load') ||
        // error.message.includes('Cannot find module')
        // ) {
        // this.appService.logger.info('No initDb file, skipping');
        // } else {
        // this.appService.logger.warn(error.message);
        // throw error;
        // }
        // }

        this.appService.logger.debug({
            isDev,
            isTest,
            isCI,
            isDevSetup,
            isProd,
        });
        return this.appService.app;
    }
}
