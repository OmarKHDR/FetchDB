import { Test, TestingModule } from '@nestjs/testing';
import { LexerService } from './lexer.service';

describe('LexerService', () => {
  let service: LexerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LexerService],
    }).compile();

    service = module.get<LexerService>(LexerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('tokenization tests: all strings', () => {
    expect(service.tokinize('SELECT username FROM users')).toEqual([
      'SELECT',
      'username',
      'FROM',
      'users',
    ]);
  });

  it('tokenization tests: using wildcard', () => {
    expect(service.tokinize('SELECT * FROM users')).toEqual([
      'SELECT',
      '*',
      'FROM',
      'users',
    ]);
  });

  it('tokenization tests: using pranthesis', () => {
    expect(
      service.tokinize(
        "INSERT INTO users values ('omar khaled', 22, 15000.00)",
      ),
    ).toEqual([
      'INSERT',
      'INTO',
      'users',
      'values',
      '(',
      "'omar khaled'",
      ',',
      '22',
      ',',
      '15000.00',
      ')',
    ]);
  });
});
