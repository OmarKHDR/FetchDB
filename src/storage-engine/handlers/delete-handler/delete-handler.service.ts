import { Injectable } from '@nestjs/common';
import { FileHandlerService } from '../file-handler/file-handler.service';
import { ReadHandlerService } from '../read-handler/read-handler.service';
import { ExprRes } from 'src/parser/types/math.types';
import { MutexService } from 'src/storage-engine/mutex/mutex.service';
import { BufferManagerService } from 'src/storage-engine/buffer-manager/buffer-manager.service';
import { UpdateHandlerService } from '../update-handler/update-handler.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';

@Injectable()
export class DeleteHandlerService {
  constructor(
    private fileHandler: FileHandlerService,
    private readHandler: ReadHandlerService,
    private mutex: MutexService,
    private bufferManager: BufferManagerService,
    private updateHandler: UpdateHandlerService,
    private winston: WinstonLoggerService,
  ) {}

  async deleteRow(tablename: string, where: ExprRes | string) {
    if (where === undefined)
      throw new Error(`delete statement must have WHERE filter`);
    const rows = await this.readHandler.getMatchedRows(tablename, '*', where);
    const updatedRows: Array<object> = [];
    for (const row of rows) {
      // going to the index get past size and pos
      // that makes it getting the whole index 12 byte to append to the buffer, so we dont need to calculate past data
      // only replace the current index with the current row
      const resolver = await this.mutex.acquireMutex(tablename);
      try {
        const index = await this.readHandler.readIndexList(
          tablename,
          Number(row['id']),
          Number(row['id']) + 1,
        );
        const buff = this.bufferManager.dataToTableBuffer(
          row as Record<string, string>,
          {},
          this.fileHandler.schemaObj[tablename],
          index[0].index,
          index[0].rowLength,
          true,
        );
        const dataOffset = (
          await this.fileHandler.tables[tablename].table.stat()
        ).size;
        await this.fileHandler.tables[tablename].table.appendFile(buff);
        await this.updateHandler.replaceIndex(
          tablename,
          row['id'] as number,
          buff,
          BigInt(dataOffset),
        );
      } catch (err) {
        this.winston.error(err, 'FileHandler');
      } finally {
        resolver('final');
      }
    }
    return updatedRows;
  }
}
