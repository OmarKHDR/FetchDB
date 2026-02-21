import { Test, TestingModule } from '@nestjs/testing';
import { StorageEngineService } from './storage-engine.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';

describe('StorageEngineService', () => {
  let service: StorageEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule],
      providers: [StorageEngineService],
    }).compile();

    service = module.get<StorageEngineService>(StorageEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
