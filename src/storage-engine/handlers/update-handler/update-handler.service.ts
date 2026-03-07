import { Injectable } from '@nestjs/common';
import { FileHandlerService } from '../file-handler/file-handler.service';
import { ExprRes } from 'src/parser/types/math.types';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { ReadHandlerService } from '../read-handler/read-handler.service';
import { MutexService } from 'src/storage-engine/mutex/mutex.service';
import { ValidatorService } from 'src/storage-engine/helper/validator.service';
import { BufferManagerService } from 'src/storage-engine/buffer-manager/buffer-manager.service';
import { TableHandlerService } from '../table-handler.service.ts/table-handler.service';

@Injectable()
export class UpdateHandlerService {
  constructor(
    private fileHandler: FileHandlerService,
    private winston: WinstonLoggerService,
    private readHandler: ReadHandlerService,
		private mutex: MutexService,
		private validator: ValidatorService,
		private bufferManager: BufferManagerService,
		private tableHandler: TableHandlerService,
  ) {}

  async updateRows(
    tablename: string,
    where: ExprRes | string | undefined,
    columns: Array<string>,
    values: Array<string>,
  ) {
    this.winston.info(`trying to update columns`);
    //for each matched row we will update the values of the object, then append values, and change the prevVersion, prevVersionSize, and the index info
    const rows = await this.readHandler.getMatchedRows(tablename, '*', where);

    const updatedRows: Array<object> = [];
    const resolver = await this.mutex.acquireMutex(tablename);
    try {
      for (const row of rows) {
        const oldRow = { ...row };
        const index = await this.readHandler.readIndexList(
          tablename,
          Number(row['id']),
          Number(row['id']) + 1,
        );
        for (const column of this.fileHandler.schemaObj[tablename]) {
          const valIndex = columns.indexOf(column.name);
          if (valIndex === -1) continue;
          if (column.name === 'id')
            throw new Error(`Violation of DB design, cannot change the id`);
          const exists = await this.readHandler.valueExists(
            tablename,
            column.name,
            values[valIndex],
            Number(row['id']),
          );
          this.validator.constraintsValidator(column, values[valIndex], exists);
          row[column.name] = values[valIndex];
        }

        const buff = this.bufferManager.dataToTableBuffer(
          row as Record<string, string>,
          oldRow,
          this.fileHandler.schemaObj[tablename],
          index[0].index,
          index[0].rowLength,
        );
        const dataOffset = (await this.fileHandler.tables[tablename].table.stat()).size;
        await this.fileHandler.tables[tablename].table.appendFile(buff);
        await this.replaceIndex(
          tablename,
          row['id'] as number,
          buff,
          BigInt(dataOffset),
        );
        delete row['prevVersion'];
        delete row['prevVersionSize'];
        updatedRows.push(row);
      }
    } catch (err) {
      this.winston.error(`${err}`, 'FileHandler');
    } finally {
      resolver('final');
    }
    return updatedRows;
  }

  async replaceIndex(
    tablename: string,
    id: number,
    buff: Buffer<ArrayBuffer>,
    offset: bigint,
  ) {
    const b = this.bufferManager.getAllocatedBuffer(0, 12);
    b.writeBigInt64LE(offset);
    b.writeInt32LE(buff.length, 8);
    await this.fileHandler.tables[tablename].index.write(b, 0, 12, id * 12);
  }
}
