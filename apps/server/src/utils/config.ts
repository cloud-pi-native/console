import path from 'node:path'
import type { systemSettingsSchema as ConfigSchema } from '@cpn-console/shared'
import { systemSettingsDefaultSchema as ConfigSchemaDefault } from '@cpn-console/shared'
import { getSystemSettings } from '@/resources/queries-index.js'

const getNodeEnv: () => 'development' | 'test' | 'production' = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}

const configPaths = {
  development: path.resolve(import.meta.dirname, './configs/config.json'),
  production: './config.json',
  test: path.resolve(import.meta.dirname, './configs/config.valid.spec.json'),
}

const CONFIG_PATH = configPaths[getNodeEnv()]

export type Config = Zod.infer<typeof ConfigSchema>

export async function getFileConfig(fileConfigPath = CONFIG_PATH): Promise<Partial<Config>> {
  try {
    const file = await import(fileConfigPath, { assert: { type: 'json' } })
      .catch(_e => console.log(`no config file detected "${fileConfigPath}"`))

    if (file) {
      return file.default
    }
    return {}
  } catch (error) {
    const errorMessage = { description: `invalid config file "${fileConfigPath}"`, error }
    throw new Error(JSON.stringify(errorMessage))
  }
}

export async function getConfig(opts?: { fileConfigPath?: string, envPrefix?: string | string[] }) {
  return ConfigSchemaDefault.parse({
    ...await getFileConfig(opts?.fileConfigPath),
    ...process.env,
    ...(await getSystemSettings()),
  })
}

export const config = await getConfig()
