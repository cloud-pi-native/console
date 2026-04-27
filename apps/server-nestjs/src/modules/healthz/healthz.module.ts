import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ArgoCDModule } from '../argocd/argocd.module'
import { GitlabModule } from '../gitlab/gitlab.module'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { KeycloakModule } from '../keycloak/keycloak.module'
import { VaultModule } from '../vault/vault.module'
import { HealthzController } from './healthz.controller'

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    KeycloakModule,
    GitlabModule,
    VaultModule,
    ArgoCDModule,
  ],
  controllers: [HealthzController],
})
export class HealthzModule {}
