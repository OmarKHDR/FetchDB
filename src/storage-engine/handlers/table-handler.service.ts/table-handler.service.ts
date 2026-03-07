import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { BufferManagerService } from '../../buffer-manager/buffer-manager.service';
import path from 'path';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import {
  SchemaHandle,
  TableHandle,
} from 'src/storage-engine/types/handlers.types';
import { MutexService } from 'src/storage-engine/mutex/mutex.service';

@Injectable()
export class TableHandlerService {
  constructor(
    private bufferManager: BufferManagerService,
    private winston: WinstonLoggerService,
    private mutex: MutexService,
  ) {}

  async getTableSize(fd: fs.FileHandle) {
    return (await fd.stat()).size;
  }

  async getRowsCount(table: TableHandle) {
    const size = (await table.index.stat()).size;
    table.rowCount = Math.max(Math.trunc(size / 12), table.rowCount || 0);
    return table.rowCount;
  }

  async createSchemaFiles(rootDir: string) {
    const schemaPath = path.join(rootDir, `schema.vjson`);
    const schemaIndexPath = path.join(rootDir, `schema.index`);
    const schemafd = await this.createFileIfNotExists(schemaPath);
    const indexfd = await this.createFileIfNotExists(schemaIndexPath);
    if (!schemafd || !indexfd) throw new Error(`couldn't open the schema file`);
    return {
      schema: schemafd,
      index: indexfd,
    };
  }

  async createFileIfNotExists(filepath: string, mode = 'a+') {
    try {
      const filehandler = await fs.open(filepath, mode);
      return filehandler;
    } catch (err) {
      this.winston.error(`${err}`, 'TableHandler');
      throw err;
    }
  }

  async openTable(rootDir: string, tablename: string) {
    const tablePath = path.join(rootDir, `${tablename}.data`);
    const indexPath = path.join(rootDir, `${tablename}.index`);
    let indexfd: fs.FileHandle;
    const tablefd = await this.createFileIfNotExists(tablePath);
    try {
      indexfd = await this.createFileIfNotExists(indexPath, 'r+');
    } catch (err) {
      if (err.code === 'ENOENT')
        indexfd = await this.createFileIfNotExists(indexPath, 'w+');
      else throw err;
    }
    if (!tablefd || !indexfd)
      throw new Error(`couldn't open the table: ${tablename}`);
    return {
      table: tablefd,
      index: indexfd,
    };
  }

  async readRowsBuffer(
    file: TableHandle | SchemaHandle,
    start: number,
    end: number,
    indexRowSize: number = 12,
  ) {
    const indexBufferArray = await file.index.read({
      position: start * indexRowSize,
      length: (end - start) * indexRowSize,
    });
    const tableBufferArray: Array<Buffer> = [];
    const indexes: Array<{ index: bigint; rowLength: number }> = [];
    for (let i = start; i < end; i++) {
      indexes.push(
        this.bufferManager.indexReader({
          buffer: indexBufferArray.buffer.subarray(
            i * indexRowSize,
            (i + 1) * indexRowSize,
          ),
          bytesRead: indexRowSize,
        }),
      );
    }
    indexes.sort((a, b) => Number(a.index - b.index));
    const fileHandle =
      (file as TableHandle).table ?? (file as SchemaHandle).schema;
    for (const index of indexes) {
      const fileBuf = await fileHandle.read({
        position: index.index,
        length: index.rowLength,
      });
      tableBufferArray.push(fileBuf.buffer.subarray(0, fileBuf.bytesRead));
    }
    return tableBufferArray;
  }

  async saveToTable(data: Buffer, files: TableHandle | SchemaHandle) {
    const fd = (files as TableHandle).table ?? (files as SchemaHandle).schema;
    const b = this.bufferManager.getAllocatedBuffer(0, 12);
    b.writeInt32LE(data.length, 8);
    const resolver = await this.mutex.acquireMutex('schemahandler');
    try {
      const dataOffset = await this.getTableSize(fd);
      b.writeBigInt64LE(BigInt(dataOffset));
      await fd.appendFile(data);
      await files.index.appendFile(b);
    } catch (err) {
      this.winston.error(`${err.stack}`, 'TableHandler');
    } finally {
      resolver('finaly');
    }
  }
}
