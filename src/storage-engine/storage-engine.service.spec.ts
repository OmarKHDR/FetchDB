import { Test, TestingModule } from '@nestjs/testing';
import { StorageEngineService } from './storage-engine.service';

describe('StorageEngineService', () => {
  let service: StorageEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageEngineService],
    }).compile();

    service = module.get<StorageEngineService>(StorageEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
