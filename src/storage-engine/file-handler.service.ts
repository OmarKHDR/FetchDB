import { Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream } from 'fs';
import { Table } from 'src/shared/types/db.schema.types';

@Injectable()
export class FileHandlerService {
  ROW_READER(table: Table, rowStart: number, rowEnd: number) {
    const reader = createReadStream(table.PATH, {
      start: rowStart,
      end: rowEnd,
      encoding: 'utf-8',
      emitClose: true,
    });
    return reader;
  }

  ROW_WRITER(table: Table, TableEnd: number) {
    const writer = createWriteStream(table.PATH, {
      start: TableEnd,
    });
    return writer;
  }
}
