import { Test, TestingModule } from '@nestjs/testing';
import { AdminTokenRouterService } from './admin-token-router.service';

describe('AdminTokenRouterService', () => {
  let service: AdminTokenRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminTokenRouterService],
    }).compile();

    service = module.get<AdminTokenRouterService>(AdminTokenRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
