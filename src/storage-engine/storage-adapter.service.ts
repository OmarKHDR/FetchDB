import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './file-handler/file-handler.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';

@Injectable()
export class StorageAdapterService {
  private readonly schemas;
  dbname: string | null = null;
  constructor(
    private fileHandler: FileHandlerService,
    private winston: WinstonLoggerService,
  ) {}
}
