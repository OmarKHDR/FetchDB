import { Injectable } from '@nestjs/common';
import { FileHandlerService } from '../file-handler/file-handler.service';
import { MutexService } from 'src/storage-engine/mutex/mutex.service';
import { BufferManagerService } from 'src/storage-engine/buffer-manager/buffer-manager.service';
import { TableHandlerService } from '../table-handler.service.ts/table-handler.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { ReadHandlerService } from '../read-handler/read-handler.service';

@Injectable()
export class WriteHandlerService {
  constructor(
    private fileHandler: FileHandlerService,
    private mutex: MutexService,
    private bufferManager: BufferManagerService,
    private tableHandler: TableHandlerService,
    private winston: WinstonLoggerService,
		private readHandler: ReadHandlerService,
  ) {}

  async writeToTable(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    console.log(this.fileHandler.schemaObj, this.fileHandler.tables)
    const buffer = await this.readHandler.getTableBuffer(
      tablename,
      values,
      columns,
    );
    await this.tableHandler.saveToTable(
      buffer,
      this.fileHandler.tables[tablename],
    );
    return {
      tablename,
      values,
      columns,
    };
  }
}
