import { Module } from '@nestjs/common';
import { ServerService } from '@old-server/server';

@Module({
    controllers: [],
    providers: [ServerService],
})
export class CpinModule {}
