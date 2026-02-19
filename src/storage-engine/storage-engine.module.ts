import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { DbHandlerService } from './db-handler/db-handler.service';
import { FileHandlerService } from './file-handler/file-handler.service';

@Module({
  providers: [StorageEngineService, DbHandlerService, FileHandlerService],
})
export class StorageEngineModule {}
