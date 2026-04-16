import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigurationService } from '../../infrastructure/configuration/configuration.service'
import { DatabaseService } from '../../infrastructure/database/database.service'

import { DatabaseInitializationService } from '../database-initialization/database-initialization.service'
import { PluginManagementService } from '../plugin-management/plugin-management.service'

@Injectable()
export class ApplicationInitializationService {
  private readonly logger = new Logger(ApplicationInitializationService.name)
  constructor(
    @Inject(ConfigurationService) private readonly configurationService: ConfigurationService,
    @Inject(PluginManagementService) private readonly pluginManagementService: PluginManagementService,
    @Inject(DatabaseInitializationService) private readonly databaseInitializationService: DatabaseInitializationService,
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {
    this.handleExit()
  }

  async setUpHTTPProxy() {
    // Workaround because fetch isn't using http_proxy variables
    // See. https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
    if (process.env.HTTP_PROXY) {
      const Undici = await import('undici')
      const ProxyAgent = Undici.ProxyAgent
      const setGlobalDispatcher = Undici.setGlobalDispatcher
      setGlobalDispatcher(new ProxyAgent(process.env.HTTP_PROXY))
    }
  }

  async injectDataInDatabase(path: string) {
    this.logger.log(`Starting database initialization using data from ${path}`)
    const { data } = await import(path)
    await this.databaseInitializationService.initDb(data)
    this.logger.log('Database initialization completed successfully')
  }

  async initApp() {
    try {
      await this.databaseService.getConnection()
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Database connection failed: ${error.message}`, error.stack)
      } else {
        this.logger.error(`Database connection failed: ${String(error)}`)
      }
      throw error
    }

    this.pluginManagementService.initPm()

    this.logger.log('Loading database initialization data')

    try {
      const dataPath
        = this.configurationService.isProd
          || this.configurationService.isInt
          ? './init/db/imports/data'
          : '@cpn-console/test-utils/src/imports/data'
      await this.injectDataInDatabase(dataPath)
      if (
        this.configurationService.isProd
        && !this.configurationService.isDevSetup
      ) {
        this.logger.log(`Cleaning up imported data module at ${dataPath}`)
        await rm(resolve(__dirname, dataPath))
        this.logger.log(`Deleted imported data module at ${dataPath}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        const errorCode = typeof (error as any)?.code === 'string' ? (error as any).code : undefined
        if (
          errorCode === 'ERR_MODULE_NOT_FOUND'
          || error.message.includes('Failed to load')
          || error.message.includes('Cannot find module')
        ) {
          this.logger.log('No database initialization data module was found, so initialization was skipped')
        } else {
          this.logger.warn(`Database initialization failed: ${error.message}`)
          throw error
        }
      } else {
        this.logger.warn(`Database initialization failed: ${String(error)}`)
        throw error
      }
    }

    this.logger.debug(`Runtime environment flags: isDev=${this.configurationService.isDev} isTest=${this.configurationService.isTest} isCI=${this.configurationService.isCI} isDevSetup=${this.configurationService.isDevSetup} isProd=${this.configurationService.isProd}`)
  }

  async exitGracefully(error?: Error) {
    if (error instanceof Error) {
      this.logger.fatal(`Exiting due to an unhandled error: ${error.message}`)
    }
    // @TODO Determine if it is necessary, or if we would rather plug ourselves
    // onto NestJS lifecycle, or even if all this is actually necessary
    // at all anymore
    //
    // await app.close();

    this.logger.log('Closing connections')
    await this.databaseService.closeConnections()
    this.logger.log('Exiting')
    process.exit(error instanceof Error ? 1 : 0)
  }

  logExitCode(code: number) {
    this.logger.warn(`Process is exiting with code ${code}`)
  }

  logUnhandledRejection(reason: unknown, promise: Promise<unknown>) {
    void promise
    if (reason instanceof Error) {
      this.logger.error(`Unhandled Promise rejection: ${reason.message}`, reason.stack)
      return
    }
    this.logger.error(`Unhandled Promise rejection: ${String(reason)}`)
  }

  handleExit() {
    process.on('exit', this.logExitCode.bind(this))
    process.on('SIGINT', this.exitGracefully.bind(this))
    process.on('SIGTERM', this.exitGracefully.bind(this))
    process.on('uncaughtException', this.exitGracefully.bind(this))
    process.on('unhandledRejection', this.logUnhandledRejection.bind(this))
  }
}
