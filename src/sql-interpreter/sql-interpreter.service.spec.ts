import { Test, TestingModule } from '@nestjs/testing';
import { SqlInterpreterService } from './sql-interpreter.service';

describe('SqlInterpreterService', () => {
  let service: SqlInterpreterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SqlInterpreterService],
    }).compile();

    service = module.get<SqlInterpreterService>(SqlInterpreterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
