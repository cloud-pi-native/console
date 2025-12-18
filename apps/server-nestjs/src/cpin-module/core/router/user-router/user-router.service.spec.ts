import { Test, TestingModule } from '@nestjs/testing';
import { UserRouterService } from './user-router.service';

describe('UserRouterService', () => {
  let service: UserRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRouterService],
    }).compile();

    service = module.get<UserRouterService>(UserRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
