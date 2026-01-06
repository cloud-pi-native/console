import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { AppService } from './app.service';

describe('appService', () => {
    let service: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        service = module.get<AppService>(AppService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
