import { Module } from '@nestjs/common';

import { CpinModule } from './cpin-module/cpin.module';

// This module only exists to import other module.
// « One module to rule them all, and in NestJs bind them »
@Module({
    imports: [CpinModule],
    controllers: [],
    providers: [],
})
export class MainModule {}
