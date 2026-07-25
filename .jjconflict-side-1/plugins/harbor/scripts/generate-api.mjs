/**
 * Generates `src/api/Api.ts` from Harbor's OpenAPI/Swagger spec.
 *
 * The spec is fetched and parsed with `js-yaml` before being handed to
 * `swagger-typescript-api`. This is deliberate: swagger-typescript-api v13
 * bundles a strict YAML parser that rejects Harbor's multi-line single-quoted
 * `description` scalars, so we parse the YAML ourselves and pass the resulting
 * JSON spec object programmatically.
 *
 * Bump HARBOR_TAG to regenerate against a newer Harbor release.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { generateApi } from 'swagger-typescript-api'

const HARBOR_TAG = process.env.HARBOR_TAG ?? 'v2.13.5'
const SPEC_URL = `https://raw.githubusercontent.com/goharbor/harbor/${HARBOR_TAG}/api/v2.0/swagger.yaml`

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/api')

console.log(`Fetching Harbor ${HARBOR_TAG} spec from ${SPEC_URL}`)
const res = await fetch(SPEC_URL)
if (!res.ok) {
  throw new Error(`Failed to fetch spec (${res.status} ${res.statusText})`)
}

const spec = yaml.load(await res.text())

await generateApi({
  spec,
  output: outputDir,
  fileName: 'Api.ts',
  httpClientType: 'axios',
})

console.log(`Generated ${outputDir}/Api.ts`)
