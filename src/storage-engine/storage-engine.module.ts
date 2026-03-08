import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { BufferManagerService } from './buffer-manager/buffer-manager.service';
import { WinstonLoggerModule } from '../winston-logger/winston-logger.module';
import { MutexService } from './mutex/mutex.service';
import { ParserModule } from 'src/parser/parser.module';
import { ObjectFilterService } from './helper/object-filter.service';
import { SharedModule } from 'src/shared/shared.module';
import { HandlersModule } from './handlers/handlers.module';

@Module({
  imports: [WinstonLoggerModule, ParserModule, HandlersModule, SharedModule],
  providers: [
    StorageEngineService,
    BufferManagerService,
    MutexService,
    ObjectFilterService,
  ],
  exports: [StorageEngineService],
})
export class StorageEngineModule {}
