import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { DbHandlerService } from './db-handler/db-handler.service';
import { FileHandlerService } from './file-handler/file-handler.service';
import { BufferManagerService } from './buffer-manager/buffer-manager.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';
import { MutexService } from './mutex/mutex.service';
import { ParserModule } from 'src/parser/parser.module';
import { StorageStrategyService } from './storage-strategy/storage-strategy.service';
import { ValidatorService } from './helper/validator.service';
import { ObjectHandlerService } from './helper/object-handler.service';

@Module({
  imports: [WinstonLoggerModule, ParserModule],
  providers: [
    StorageEngineService,
    DbHandlerService,
    FileHandlerService,
    BufferManagerService,
    MutexService,
    StorageStrategyService,
    ValidatorService,
    ObjectHandlerService,

  ],
  exports: [StorageEngineService, FileHandlerService],
})
export class StorageEngineModule {}
