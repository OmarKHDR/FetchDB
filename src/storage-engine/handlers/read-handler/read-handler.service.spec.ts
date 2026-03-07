import { Test, TestingModule } from '@nestjs/testing';
import { ReadHandlerService } from './read-handler.service';

describe('ReadHandlerService', () => {
  let service: ReadHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReadHandlerService],
    }).compile();

    service = module.get<ReadHandlerService>(ReadHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
