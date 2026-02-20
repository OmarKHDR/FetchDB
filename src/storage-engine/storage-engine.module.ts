import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { DbHandlerService } from './db-handler/db-handler.service';
import { FileHandlerService } from './file-handler/file-handler.service';
import { TableHandlerService } from './table-reader/table-handler.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';

@Module({
  imports: [WinstonLoggerModule],
  providers: [
    StorageEngineService,
    DbHandlerService,
    FileHandlerService,
    TableHandlerService,
  ],
})
export class StorageEngineModule {}
