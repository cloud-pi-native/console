import { Test, TestingModule } from '@nestjs/testing';
import { HttpClientService } from './http-client.service';

describe('HttpClientService', () => {
  let service: HttpClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpClientService],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
