import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { DbHandlerService } from './db-handler/db-handler.service';
import { FileHandlerService } from './file-handler/file-handler.service';
import { TableHandlerService } from './table-reader/table-handler.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';
import { MutexService } from './mutex/mutex.service';
import { ParserModule } from 'src/parser/parser.module';
import { StorageStrategyService } from './storage-strategy/storage-strategy.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [WinstonLoggerModule, ParserModule, SharedModule],
  providers: [
    StorageEngineService,
    DbHandlerService,
    FileHandlerService,
    TableHandlerService,
    MutexService,
    StorageStrategyService,
  ],
  exports: [StorageEngineService, FileHandlerService],
})
export class StorageEngineModule {}
