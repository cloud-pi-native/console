import type { PluginManagerOptions } from '@cpn-console/hooks';

import { isCI, isInt, isProd } from './env.js';

export const pluginManagerOptions: PluginManagerOptions = {
    mockHooks: isCI || (!isProd && !isInt),
    mockMonitoring: isCI || (!isProd && !isInt),
    mockExternalServices: isCI || (!isProd && !isInt),
    startPlugins: (!isCI && isProd) || isInt,
};
