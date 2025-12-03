import { Test, TestingModule } from '@nestjs/testing';
import { CpinController } from './cpin.controller';

describe('CpinController', () => {
  let controller: CpinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CpinController],
    }).compile();

    controller = module.get<CpinController>(CpinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
