import { Test, TestingModule } from '@nestjs/testing';
import { LogRouterService } from './log-router.service';

describe('LogRouterService', () => {
  let service: LogRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogRouterService],
    }).compile();

    service = module.get<LogRouterService>(LogRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
