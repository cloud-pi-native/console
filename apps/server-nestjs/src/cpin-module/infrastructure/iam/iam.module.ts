import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseModule } from '../database/database.module'
import { AuthService } from './auth.service'
import { AbilityGuard } from './guards/ability.guard'
import { AuthGuard } from './guards/auth.guard'
import { RoleGuard } from './guards/role.guard'

@Module({
  imports: [
    ConfigurationModule,
    CacheModule.register({}),
    DatabaseModule,
    JwtModule.register({}),
  ],
  providers: [
    AbilityGuard,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class IamModule {}
