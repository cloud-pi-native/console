import { Test, TestingModule } from '@nestjs/testing';
import { ServiceMonitorRouterService } from './service-monitor-router.service';

describe('ServiceMonitorRouterService', () => {
  let service: ServiceMonitorRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceMonitorRouterService],
    }).compile();

    service = module.get<ServiceMonitorRouterService>(ServiceMonitorRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
