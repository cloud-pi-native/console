import { Module } from '@nestjs/common';

import { ConfigurationModule } from '../infrastructure/configuration/configuration.module';
import { AppService } from './app/app.service';

@Module({
    imports: [ConfigurationModule],
    providers: [AppService],
})
export class CoreModule {}
