import { Inject, Injectable, Logger } from '@nestjs/common'
import { z } from 'zod'
import { ConfigurationService } from '../../configuration/configuration.service'

export const JwksResponseSchema = z.object({
  keys: z.array(z.object({
    kid: z.string(),
    kty: z.string(),
    use: z.string(),
    n: z.string(),
    e: z.string(),
  })),
})

export type JwksResponse = z.infer<typeof JwksResponseSchema>

@Injectable()
export class KeycloakJwtClientService {
  private readonly logger = new Logger(KeycloakJwtClientService.name)

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  async fetchJwks(): Promise<JwksResponse | undefined> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.keycloakJwksTimeoutMs)

    try {
      const response = await fetch(this.config.getKeycloakCertsUrl(), { signal: controller.signal })
      if (!response.ok) {
        this.logger.error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`)
        return undefined
      }

      const raw = await response.json()
      return JwksResponseSchema.parse(raw)
    } catch (error) {
      this.logger.error(`Failed to fetch JWKS: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    } finally {
      clearTimeout(timeout)
    }
  }
}
