import { Test, TestingModule } from '@nestjs/testing';
import { ServiceChainRouterService } from './service-chain-router.service';

describe('ServiceChainRouterService', () => {
  let service: ServiceChainRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceChainRouterService],
    }).compile();

    service = module.get<ServiceChainRouterService>(ServiceChainRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
