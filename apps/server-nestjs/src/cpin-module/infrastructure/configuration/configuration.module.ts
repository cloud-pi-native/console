import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ConfigurationService } from './configuration.service';

const pathList: string[] = [];

if (process.env.DOCKER !== 'true') {
    pathList.push('.env');
}

if (process.env.INTEGRATION === 'true') {
    pathList.push('.env.integ');
}

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: pathList,
        }),
    ],
    providers: [ConfigurationService],
    exports: [ConfigurationService],
})
export class ConfigurationModule {}
