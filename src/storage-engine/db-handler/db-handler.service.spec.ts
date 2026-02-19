import { Test, TestingModule } from '@nestjs/testing';
import { DbHandlerService } from './db-handler.service';

describe('DbHandlerService', () => {
  let service: DbHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbHandlerService],
    }).compile();

    service = module.get<DbHandlerService>(DbHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
