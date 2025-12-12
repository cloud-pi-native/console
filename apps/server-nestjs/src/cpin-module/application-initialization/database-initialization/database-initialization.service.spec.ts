import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseInitializationService } from './database-initialization.service';

describe('DatabaseInitializationService', () => {
  let service: DatabaseInitializationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseInitializationService],
    }).compile();

    service = module.get<DatabaseInitializationService>(DatabaseInitializationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
