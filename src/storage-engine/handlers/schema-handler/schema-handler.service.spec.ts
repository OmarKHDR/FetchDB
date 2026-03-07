import { Test, TestingModule } from '@nestjs/testing';
import { SchemaHandlerService } from './schema-handler.service';

describe('SchemaHandlerService', () => {
  let service: SchemaHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaHandlerService],
    }).compile();

    service = module.get<SchemaHandlerService>(SchemaHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
