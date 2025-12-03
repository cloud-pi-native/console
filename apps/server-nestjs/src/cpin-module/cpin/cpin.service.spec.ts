import { Test, TestingModule } from '@nestjs/testing';
import { CpinService } from './cpin.service';

describe('CpinService', () => {
  let service: CpinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CpinService],
    }).compile();

    service = module.get<CpinService>(CpinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
