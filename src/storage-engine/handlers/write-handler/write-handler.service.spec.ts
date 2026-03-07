import { Test, TestingModule } from '@nestjs/testing';
import { WriteHandlerService } from './write-handler.service';

describe('WriteHandlerService', () => {
  let service: WriteHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WriteHandlerService],
    }).compile();

    service = module.get<WriteHandlerService>(WriteHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
