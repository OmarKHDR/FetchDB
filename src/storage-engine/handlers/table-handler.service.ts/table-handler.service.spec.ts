import { Test, TestingModule } from '@nestjs/testing';
import { TableHandlerService } from './table-handler.service';

describe('TableHandlerService', () => {
  let service: TableHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableHandlerService],
    }).compile();

    service = module.get<TableHandlerService>(TableHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
