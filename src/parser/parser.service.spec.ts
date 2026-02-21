import { Test, TestingModule } from '@nestjs/testing';
import { ParserService } from './parser.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';
import { SharedModule } from '../shared/shared.module';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule, SharedModule],
      providers: [ParserService],
    }).compile();

    service = module.get<ParserService>(ParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
