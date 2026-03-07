import { Module } from '@nestjs/common';
import { WriteHandlerService } from './write-handler/write-handler.service';
import { ReadHandlerService } from './read-handler/read-handler.service';
import { UpdateHandlerService } from './update-handler/update-handler.service';
import { DeleteHandlerService } from './delete-handler/delete-handler.service';
import { SchemaHandlerService } from './schema-handler/schema-handler.service';
import { FileHandlerService } from './file-handler/file-handler.service';
import { DbHandlerService } from './db-handler/db-handler.service';
import { TableHandlerService } from './table-handler.service.ts/table-handler.service';
import { ParserModule } from 'src/parser/parser.module';
import { BufferManagerService } from '../buffer-manager/buffer-manager.service';
import { WinstonLoggerModule } from 'src/winston-logger/winston-logger.module';
import { MutexService } from '../mutex/mutex.service';
import { ObjectFilterService } from '../helper/object-filter.service';
import { ValidatorService } from '../helper/validator.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [ParserModule, WinstonLoggerModule, SharedModule],
  providers: [
    BufferManagerService,
    ObjectFilterService,
    ValidatorService,
    MutexService,
    WriteHandlerService,
    ReadHandlerService,
    UpdateHandlerService,
    DeleteHandlerService,
    SchemaHandlerService,
    FileHandlerService,
    DbHandlerService,
    TableHandlerService,
  ],
  exports: [
    WriteHandlerService,
    ReadHandlerService,
    UpdateHandlerService,
    DeleteHandlerService,
    SchemaHandlerService,
    FileHandlerService,
    TableHandlerService,
  ],
})
export class HandlersModule {}
