import { Test, TestingModule } from '@nestjs/testing';
import { StorageStrategyService } from './storage-strategy.service';

describe('StorageStrategyService', () => {
  let service: StorageStrategyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageStrategyService],
    }).compile();

    service = module.get<StorageStrategyService>(StorageStrategyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
