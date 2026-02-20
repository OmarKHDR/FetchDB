import { Test, TestingModule } from '@nestjs/testing';
import { FileHandlerService } from './file-handler.service';
import { Column } from '../types/column.type';

describe('FileHandlerService', () => {
  let service: FileHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileHandlerService],
    }).compile();

    service = module.get<FileHandlerService>(FileHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creating new table', async () => {
    const columns: Array<Column> = [
      {
        name: 'name',
        type: 'VARCHAR',
        IsPK: true,
      },
    ];
    await service.createNewTable('students', columns);
  });
});
