import { Injectable } from '@nestjs/common';
import { Column, Type } from '../types/column.type';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';

// table data is
// assuming pk is always at the begining and is a serial
// [pk-serial]|[data]|[data]|[data]|[prevVersion][deletedbyte]
@Injectable()
export class TableHandlerService {
  constructor(private winston: WinstonLoggerService) {}
  tableBufferToObject(
    bufferObj: { buffer: Buffer; bytesRead: number },
    obj: Column[],
  ) {
    const result = {};
    const { buffer, bytesRead } = bufferObj;
    //buffer must end at the end of the column (the index file solution)
    if (buffer.readUInt8(bytesRead - 1) === 1)
      return {
        deleted: true,
      };
    result['prevVersion'] = buffer.readBigUInt64LE(bytesRead - 9);
    let cellStart = 0;
    // result['internalRowId'] = this.__getDataByType(buffer, 0, 8, 'SERIAL');
    // cellStart = 9;
    for (const column of obj) {
      const cellEnd = buffer.indexOf(0x7c, cellStart);
      if (cellEnd === cellStart) {
        result[column.name] = 'Null';
        continue;
      }
      result[column.name] = this.__getDataByType(
        buffer,
        cellStart,
        cellEnd,
        column.type,
      );
      cellStart = cellEnd + 1;
    }
  }

  __getDataByType(buffer: Buffer, start: number, end: number, datatype: Type) {
    switch (datatype) {
      case 'VARCHAR':
        return buffer.toString('utf8', start, end);
      case 'FLOAT':
        return buffer.readFloatLE(start);
      case 'INT':
        return buffer.readInt32LE(start);
      case 'SERIAL':
        return buffer.readBigUInt64LE(start);
      default:
        throw new Error('not implemented datatype');
    }
  }

  __getBufferByType(data: string, type: Type) {
    let buffer: Buffer;
    switch (type) {
      case 'VARCHAR':
        return Buffer.from(String(data), 'utf-8');
      case 'FLOAT':
        buffer = Buffer.alloc(4);
        buffer.writeFloatLE(parseFloat(data));
        return buffer;
      case 'INT':
        buffer = Buffer.alloc(4);
        buffer.writeInt32LE(parseInt(data));
        return buffer;
      case 'SERIAL':
        buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(BigInt(data));
        return buffer;
      default:
        throw new Error('not implemented datatype');
    }
  }

  dataToTableBuffer(
    data: Record<string, string>,
    obj: Column[],
    prevVersion?: bigint,
  ) {
    const result: Buffer[] = [];
    for (const column of obj) {
      if (data[column.name]) {
        //assuming any column would begin with a serial pk
        result.push(this.__getBufferByType(data[column.name], column.type));
      }
      result.push(Buffer.from(String('|'), 'utf-8'));
    }
    if (prevVersion !== undefined) {
      result.push(
        this.__getBufferByType(prevVersion.toString(), 'SERIAL' as Type),
      );
    }
    const deletedByte = Buffer.alloc(1);
    deletedByte.writeInt8(0);
    result.push(deletedByte);
    return result;
  }

  // indexes has fixed size rows so calculating their offset is easy
  // size of row * rowid
  // index will have rowidoffset both are bigint no need for
  indexReader(bufferObj: { buffer: Buffer; bytesRead: number }) {
    const { buffer } = bufferObj;
    const index = {};
    //why would we need to write the id if its already calculated by the pk * 8bytes
    // index['internalRowId'] = buffer.readBigInt64LE(0);
    index['offset'] = buffer.readBigInt64LE(0);
    return index;
  }
}
