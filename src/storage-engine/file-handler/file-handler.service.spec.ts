import { Test, TestingModule } from '@nestjs/testing';
import { FileHandlerService } from './file-handler.service';
import { WinstonLoggerModule } from '../../winston-logger/winston-logger.module';
import { DbHandlerService } from '../db-handler/db-handler.service';

describe('FileHandlerService', () => {
  let service: FileHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule],
      providers: [FileHandlerService, DbHandlerService],
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
