import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationInitializationService } from './application-initialization.service';

describe('ApplicationInitializationServiceService', () => {
  let service: ApplicationInitializationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApplicationInitializationService],
    }).compile();

    service = module.get<ApplicationInitializationService>(ApplicationInitializationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
