import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service';
import { plugin as argo } from '@cpn-console/argocd-plugin';
import { plugin as gitlab } from '@cpn-console/gitlab-plugin';
import { plugin as harbor } from '@cpn-console/harbor-plugin';
import {
    type Plugin,
    PluginManagerOptions,
    pluginManager,
} from '@cpn-console/hooks';
import { plugin as keycloak } from '@cpn-console/keycloak-plugin';
import { plugin as kubernetes } from '@cpn-console/kubernetes-plugin';
import { plugin as nexus } from '@cpn-console/nexus-plugin';
import { plugin as sonarqube } from '@cpn-console/sonarqube-plugin';
import { plugin as vault } from '@cpn-console/vault-plugin';
import { Injectable } from '@nestjs/common';
import { readdirSync, statSync } from 'node:fs';

@Injectable()
export class PluginManagementService {
    constructor(private readonly configurationService: ConfigurationService) {}

    async initPm() {
        const pluginManagerOptions: PluginManagerOptions = {
            mockHooks:
                this.configurationService.isCI ||
                (!this.configurationService.isProd &&
                    !this.configurationService.isInt),
            mockMonitoring:
                this.configurationService.isCI ||
                (!this.configurationService.isProd &&
                    !this.configurationService.isInt),
            mockExternalServices:
                this.configurationService.isCI ||
                (!this.configurationService.isProd &&
                    !this.configurationService.isInt),
            startPlugins:
                (!this.configurationService.isCI &&
                    this.configurationService.isProd) ||
                this.configurationService.isInt,
        };
        const pm = pluginManager(pluginManagerOptions);
        pm.register(argo);
        pm.register(gitlab);
        pm.register(harbor);
        pm.register(keycloak);
        pm.register(kubernetes);
        pm.register(nexus);
        pm.register(sonarqube);
        pm.register(vault);

        if (
            !statSync(this.configurationService.pluginsDir, {
                throwIfNoEntry: false,
            })
        ) {
            return pm;
        }
        for (const dirName of readdirSync(
            this.configurationService.pluginsDir,
        )) {
            const moduleAbsPath = `${this.configurationService.pluginsDir}/${dirName}`;
            try {
                statSync(`${moduleAbsPath}/package.json`);
                const pkg = await import(`${moduleAbsPath}/package.json`, {
                    with: { type: 'json' },
                });
                const entrypoint = pkg.default.module || pkg.default.main;
                if (!entrypoint)
                    throw new Error(
                        `No entrypoint found in package.json : ${pkg.default.name}`,
                    );
                const { plugin } = (await import(
                    `${moduleAbsPath}/${entrypoint}`
                )) as { plugin: Plugin };
                pm.register(plugin);
            } catch (error) {
                console.error(`Could not import module ${moduleAbsPath}`);
                console.error(error.stack);
            }
        }

        return pm;
    }
}
