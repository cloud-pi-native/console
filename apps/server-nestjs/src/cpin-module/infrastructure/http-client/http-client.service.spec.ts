import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { HttpClientService } from './http-client.service';

describe('httpClientService', () => {
    let service: HttpClientService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HttpClientService],
        }).compile();

        service = module.get<HttpClientService>(HttpClientService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
