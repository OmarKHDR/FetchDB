import { Test, TestingModule } from '@nestjs/testing';
import { DbHandlerService } from './db-handler.service';
import { WinstonLoggerModule } from '../../winston-logger/winston-logger.module';

describe('DbHandlerService', () => {
  let service: DbHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule],
      providers: [DbHandlerService],
    }).compile();

    service = module.get<DbHandlerService>(DbHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
