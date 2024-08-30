import path from 'node:path'
import { SystemSettingSchema as ConfigSchema } from '@cpn-console/shared'

const getNodeEnv: () => 'development' | 'test' | 'production' = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}

function snakeCaseToCamelCase(input: string) {
  return input
    .split('_')
    .reduce((acc, cur, i) => {
      if (!i) {
        return cur.toLowerCase()
      }
      return acc + cur.charAt(0).toUpperCase() + cur.substring(1).toLowerCase()
    }, '')
}

function deepMerge(target: any, source: any) {
  const result = { ...target, ...source }
  for (const key of Object.keys(result)) {
    if (Array.isArray(target[key]) && Array.isArray(source[key])) {
      result[key] = result[key].map((value: unknown, idx: number) => {
        return typeof value === 'object'
          ? deepMerge(target[key][idx], source[key][idx])
          : structuredClone(result[key][idx])
      })
    } else if (typeof target[key] === 'object' && typeof source[key] === 'object') {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = structuredClone(result[key])
    }
  }
  return result
}

const configPaths = {
  development: path.resolve(__dirname, '../../config-example.json'),
  production: '/app/config.json',
  test: path.resolve(__dirname, './configs/config.valid.spec.json'),
}

const CONFIG_PATH = configPaths[getNodeEnv()]
const ENV_PREFIX = ['API__', 'DOC__']

// export const ConfigSchema = z.object({
//   maintenance: z.string().default('off'),
//   appName: z.string().default('Console Cloud Pi Native TEST DE FOU'),
//   contactMail: z.string().default('cloudpinative-relations@interieur.gouv.fr'),
//   appSubTitle: z.array(z.string()).default(['Ministère 2', 'de l’intérieur 3', 'et des outre-mer 4']),
//   // appLogoUrl: z.string().default(''), // pas sur de la faisabilité
// }).strict()

export type Config = Zod.infer<typeof ConfigSchema>

// maybe a modifié ? ?
export function parseEnv(obj: Record<string, string>): Config | Record<PropertyKey, never> {
  return Object
    .entries(obj)
    .map(([key, value]) => key
      .split('__')
      .toReversed()
      .reduce((acc, val, idx) => {
        if (!idx) {
          try {
            return { [snakeCaseToCamelCase(val)]: JSON.parse(value) }
          } catch (_e) {
            return { [snakeCaseToCamelCase(val)]: value }
          }
        } else {
          return { [snakeCaseToCamelCase(val)]: acc }
        }
      }, {}))
    .reduce((acc, val) => deepMerge(acc, val), {})
}

// pour recup l'env
export function getEnv(prefix: string | string[] = ENV_PREFIX): Record<string, string> {
  return Object
    .entries(process.env)
    .filter(([key, _value]) => Array.isArray(prefix) ? prefix.some(p => key.startsWith(p)) : key.startsWith(prefix))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
}

export async function getConfig(opts?: { fileConfigPath?: string, envPrefix?: string | string[] }) {
  const fileConfigPath = opts?.fileConfigPath ?? CONFIG_PATH
  const envPrefix = opts?.envPrefix ?? ENV_PREFIX

  const defaultConfig = ConfigSchema.parse({})
  let envConfig: Config | Record<PropertyKey, never> = {}
  let fileConfig: Config | Record<PropertyKey, never> = {}
  // const dbConfig: Config | Record<PropertyKey, never> = {}

  try {
    envConfig = parseEnv(getEnv(envPrefix))
    ConfigSchema.partial().parse(envConfig)
  } catch (error) {
    const errorMessage = { description: 'invalid config environment variables', error }
    throw new Error(JSON.stringify(errorMessage))
  }

  try {
    const file = await import(fileConfigPath, { assert: { type: 'json' } })

      .catch(_e => console.log(`no config file detected "${fileConfigPath}"`))
    if (file) {
      fileConfig = file.default
      ConfigSchema.partial().parse(fileConfig)
    }
  } catch (error) {
    const errorMessage = { description: `invalid config file "${fileConfigPath}"`, error }
    throw new Error(JSON.stringify(errorMessage))
  }

  // try {
  //   dbConfig = JSON.parse(await getSystemSettings())
  // } catch (error) {
  //   const errorMessage = { description: `invalid config env`, error }
  //   throw new Error(JSON.stringify(errorMessage))
  // }

  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
    // ...dbConfig,
  }
}

export const config = await getConfig()
