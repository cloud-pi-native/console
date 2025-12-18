import { Module } from '@nestjs/common';

import { ApplicationInitializationModule } from './application-initialization/application-initialization.module';
import { CoreModule } from './core/core.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

// This module host the old "server code" of our backend.
// It it means to be empty in the future, by extracting from it
// as many modules as possible !
@Module({
    imports: [
        ApplicationInitializationModule,
        CoreModule,
        InfrastructureModule,
    ],
})
export class CpinModule {}
