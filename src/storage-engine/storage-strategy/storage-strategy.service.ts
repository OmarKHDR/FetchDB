import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { BufferManagerService } from '../buffer-manager/buffer-manager.service';
import path from 'path';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';

// a service used to handle side buffer + file handler compined logic, so the file handler don't need to do any file writes or reads
// only uses this service internals
@Injectable()
export class StorageStrategyService {
  constructor(
    private bufferHandler: BufferManagerService,
    private winston: WinstonLoggerService,
  ) {}

  async getTableSize(fd: fs.FileHandle) {
    return (await fd.stat()).size;
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
      this.winston.error(`${err}`, 'FileHandler');
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


  async readRowsFromIndexBuffer(
    indexBufferObj: { buffer: Buffer; bytesRead: number },
    tableFileHandle: fs.FileHandle,
    end: number,
    indexRowSize: number,
  ) {
    const tableBufferArray: Array<Buffer> = [];
    const indexes: Array<{ index: bigint; rowLength: number }> = [];
    for (let i = 0; i < end; i++) {
      indexes.push(
        this.bufferHandler.indexReader({
          buffer: indexBufferObj.buffer.subarray(
            i * indexRowSize,
            (i + 1) * indexRowSize,
          ),
          bytesRead: indexRowSize,
        }),
      );
    }
    for (const index of indexes) {
      const fileBuf = await tableFileHandle.read({
        position: index.index,
        length: index.rowLength,
      });
      tableBufferArray.push(fileBuf.buffer.subarray(0, fileBuf.bytesRead));
    }
    return tableBufferArray;
  }
}
