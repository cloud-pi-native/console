import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { MainModule } from './main.module';

async function bootstrap() {
    const app = await NestFactory.create(MainModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
