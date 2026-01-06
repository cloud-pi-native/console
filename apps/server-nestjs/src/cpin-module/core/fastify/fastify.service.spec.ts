import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { FastifyService } from './fastify.service';

describe('fastifyService', () => {
    let service: FastifyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FastifyService],
        }).compile();

        service = module.get<FastifyService>(FastifyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
