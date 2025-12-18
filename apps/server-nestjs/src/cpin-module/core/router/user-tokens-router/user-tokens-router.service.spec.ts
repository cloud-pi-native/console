import { Test, TestingModule } from '@nestjs/testing';
import { UserTokensRouterService } from './user-tokens-router.service';

describe('UserTokensRouterService', () => {
  let service: UserTokensRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserTokensRouterService],
    }).compile();

    service = module.get<UserTokensRouterService>(UserTokensRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
