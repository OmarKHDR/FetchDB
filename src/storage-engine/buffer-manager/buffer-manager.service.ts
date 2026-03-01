import { Injectable } from '@nestjs/common';
import { Column, Type } from '../types/column.type';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';

// not handling any files only dealing with buffers
// table data is
// assuming pk is always at the begining and is a serial
// [pk-serial]|[data]|[data]|[data]|[prevVersion][prevVersionSize][deletedbyte]
@Injectable()
export class BufferManagerService {
  constructor(private winston: WinstonLoggerService) {}
  tableBufferToObject(
    bufferObj: { buffer: Buffer; bytesRead: number },
    columns: Column[],
  ) {
    const result = {};
    const { buffer, bytesRead } = bufferObj;

    const prevVersion = Number(buffer.readBigInt64LE(bytesRead - (1 + 4 + 8)));
    const prevVersionSize = buffer.readInt32LE(bytesRead - (1 + 4));

    result['prevVersion'] = prevVersion === -1 ? undefined : prevVersion;
    result['prevVersionSize'] =
      prevVersionSize === -1 ? undefined : prevVersionSize;

    if (buffer.readUInt8(bytesRead - 1) === 1)
      return {
        deleted: true,
        prevVersion,
        prevVersionSize,
      };

    let cellStart = 0;
    for (const column of columns) {
      const cellEnd = buffer.indexOf(0x7c, cellStart);
      if (cellEnd === cellStart) {
        result[column.name] = '"null"';
        cellStart++;
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
    return result;
  }

  __getDataByType(buffer: Buffer, start: number, end: number, datatype: Type) {
    switch (datatype) {
      case 'varchar':
        return buffer.toString('utf8', start + 1, end - 1);
      case 'float':
        return buffer.readFloatLE(start);
      case 'int':
        return buffer.readInt32LE(start);
      case 'serial':
        return Number(buffer.readBigInt64LE(start));
      case 'timestamp':
        return buffer.toString('utf8', start + 1, end - 1);
      default:
        throw new Error('not implemented datatype');
    }
  }

  __getBufferByType(data: string, type: Type, nextSerial?: number) {
    let buffer: Buffer;
    if (data === undefined) {
      return Buffer.from(String(''), 'utf-8');
    }
    switch (type) {
      case 'varchar':
        return Buffer.from(String(data), 'utf-8');
      case 'float':
        buffer = Buffer.alloc(4);
        buffer.writeFloatLE(parseFloat(data));
        return buffer;
      case 'int':
        buffer = Buffer.alloc(4);
        buffer.writeInt32LE(parseInt(data));
        return buffer;
      case 'serial':
        buffer = Buffer.alloc(8);
        if (nextSerial && nextSerial - 1 === Number(data))
          buffer.writeBigInt64LE(BigInt(nextSerial - 1));
        else
          throw new Error(
            `Wrong Serial provided for a serial column: provided ${data}, expected ${nextSerial}`,
          );
        return buffer;
      case 'offset-serial':
        buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(BigInt(data));
        return buffer;
      case 'timestamp':
        return Buffer.from(String(data), 'utf-8');
      default:
        throw new Error('not implemented datatype');
    }
  }

  dataToTableBuffer(
    newData: Record<string, string>,
    oldData: Record<string, string>,
    columns: Column[],
    prevVersion?: bigint,
    prevVersionSize?: number,
    deleteRow?: boolean,
  ) {
    const result: Buffer[] = [];
    for (const column of columns) {
      if (
        newData[column.name] !== undefined ||
        oldData[column.name] !== undefined
      ) {
        //assuming any row would begin with a serial
        this.winston.info(
          `trying to add ${newData[column.name]} into ${column.name}`,
        );
        result.push(
          this.__getBufferByType(
            newData[column.name] ?? oldData[column.name],
            column.type,
            column.serial,
          ),
        );
      }
      result.push(Buffer.from(String('|'), 'utf-8'));
    }
    if (prevVersion === undefined || prevVersionSize === undefined) {
      prevVersion = BigInt(-1);
      prevVersionSize = -1;
    }
    result.push(
      this.__getBufferByType(prevVersion.toString(), 'offset-serial' as Type),
    );
    result.push(
      this.__getBufferByType(prevVersionSize.toString(), 'int' as Type),
    );
    const deletedByte = Buffer.alloc(1);
    if (deleteRow === true) deletedByte.writeInt8(1);
    else deletedByte.writeInt8(0);
    result.push(deletedByte);
    return Buffer.concat(result);
  }

  // indexes has fixed size rows so calculating their offset is easy
  // size of row * rowid
  // index will have rowidoffset both are bigint no need for
  indexReader(bufferObj: { buffer: Buffer; bytesRead: number }) {
    const { buffer } = bufferObj;
    //why would we need to write the id if its already calculated by the pk * 8bytes
    // index['internalRowId'] = buffer.readBigInt64LE(0);
    const index = buffer.readBigInt64LE(0);
    const rowLength = buffer.readInt32LE(8);
    // each row will be 8 + 4 = 12 bytes
    return { index, rowLength };
  }

  getAllocatedBuffer(start: number, end: number) {
    const buf: Buffer = Buffer.alloc(end - start);
    return buf;
  }
}
