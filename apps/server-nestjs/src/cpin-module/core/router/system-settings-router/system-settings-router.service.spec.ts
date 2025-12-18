import { Test, TestingModule } from '@nestjs/testing';
import { SystemSettingsRouterService } from './system-settings-router.service';

describe('SystemSettingsRouterService', () => {
  let service: SystemSettingsRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemSettingsRouterService],
    }).compile();

    service = module.get<SystemSettingsRouterService>(SystemSettingsRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
