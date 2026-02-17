import { Module } from '@nestjs/common';
import { StorageEngineService } from './storage-engine.service';
import { DbCreatorService } from './db-creator.service';

@Module({
  providers: [StorageEngineService, DbCreatorService],
})
export class StorageEngineModule {}
