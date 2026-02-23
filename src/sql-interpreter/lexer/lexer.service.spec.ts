import { Test, TestingModule } from '@nestjs/testing';
import { LexerService } from './lexer.service';
import { WinstonLoggerModule } from '../../winston-logger/winston-logger.module';

describe('LexerService', () => {
  let service: LexerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule],
      providers: [LexerService],
    }).compile();

    service = module.get<LexerService>(LexerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('tokenization tests: all strings', () => {
    expect(service.tokinize('SELECT username FROM users Where id>=id')).toEqual(
      ['select', 'username', 'from', 'users', 'where', 'id', '>=', 'id'],
    );
  });
});
