import { Test, TestingModule } from '@nestjs/testing';
import { AdminRoleRouterService } from './admin-role-router.service';

describe('AdminRoleRouterService', () => {
  let service: AdminRoleRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminRoleRouterService],
    }).compile();

    service = module.get<AdminRoleRouterService>(AdminRoleRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
