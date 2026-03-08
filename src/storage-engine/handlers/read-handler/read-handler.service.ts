import { Injectable } from '@nestjs/common';
import { FileHandlerService } from '../file-handler/file-handler.service';
import { BufferManagerService } from 'src/storage-engine/buffer-manager/buffer-manager.service';
import { ExprRes } from 'src/parser/types/math.types';
import { TableHandlerService } from '../table-handler.service.ts/table-handler.service';
import { ObjectFilterService } from 'src/storage-engine/helper/object-filter.service';
import { MathService } from 'src/parser/math/math.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { ValidatorService } from 'src/shared/validator.service';
import { dataVersions } from 'src/storage-engine/types/versions.type';
import { Order } from 'src/parser/types/trees';
import { table } from 'console';

@Injectable()
export class ReadHandlerService {
  constructor(
    private fileHandler: FileHandlerService,
    private bufferManager: BufferManagerService,
    private tableHandler: TableHandlerService,
    private objectFilter: ObjectFilterService,
    private math: MathService,
    private winston: WinstonLoggerService,
    private validator: ValidatorService,
  ) {}

  async getTableBuffer(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    if (
      !this.fileHandler.tables[tablename] ||
      !this.fileHandler.schemaObj[tablename]
    )
      throw new Error(`table ${tablename} doesn't exists`);
    const row: Record<string, string> = {};
    if (!columns || !columns.length) {
      if (values.length !== this.fileHandler.schemaObj[tablename].length) {
        throw new Error(`inserted data doesn't match table schema`);
      } else {
        // no names provided for columns and columns matches schema
        let i = 0;
        for (const column of this.fileHandler.schemaObj[tablename]) {
          let valExist = false;
          if (column.IsUnique)
            valExist = await this.valueExists(
              tablename,
              column.name,
              values[i],
            );
          this.validator.constraintsValidator(column, values[i], valExist);
          row[column.name] = values[i++];
        }
      }
    } else {
      for (const column of this.fileHandler.schemaObj[tablename]) {
        if (columns.includes(column.name)) {
          const index = columns.indexOf(column.name);
          let valExist = false;
          if (column.IsUnique)
            valExist = await this.valueExists(
              tablename,
              column.name,
              values[index],
            );
          this.validator.constraintsValidator(column, values[index], valExist);
          row[column.name] = values[index];
        } else {
          if (column.default) row[column.name] = column.default;
          if (column.type === 'serial') {
            if (column.serial === undefined) {
              throw new Error(
                `Cannot load the next Serial for column ${column.name}`,
              );
            }
            row[column.name] = String(column.serial++);
          } else if (!column.IsNullable) {
            throw new Error(`value for column ${column.name} must be setten`);
          }
        }
      }
    }
    return this.bufferManager.dataToTableBuffer(
      row,
      {},
      this.fileHandler.schemaObj[tablename],
    );
  }

  async loadRowList(
    tablename: string,
    start: bigint,
    end: bigint,
    sizes: Array<number>,
  ) {
    const bufObj = await this.fileHandler.tables['tablename'].table.read({
      position: start,
      length: Number(end - start),
    });
    let s = 0;
    const result: Array<Record<string, string>> = [];
    for (const size of sizes) {
      const obj = this.bufferManager.tableBufferToObject(
        {
          buffer: bufObj.buffer.subarray(s, s + size),
          bytesRead: size,
        },
        this.fileHandler.schemaObj[tablename],
      );
      s += size;
      result.push(obj);
      if (s >= bufObj.bytesRead) break;
    }
    return result;
  }
  async readEqId(tablename: string, id: number) {
    if (id < 0)
      throw new Error(`Type Violation: the SERIAL id can't go below zero`);
    const indexOffset = id * 12;

    const buf: { buffer: Buffer; bytesRead: number } =
      await this.fileHandler.tables[tablename].index.read({
        position: indexOffset,
        length: 12,
      });
    const dataOffset = Number(buf.buffer.readBigInt64LE(0));
    const dataLength = Number(buf.buffer.readInt32LE(8));
    if (dataLength === 0) return {};
    const fileBuf = await this.fileHandler.tables[tablename].table.read({
      position: dataOffset,
      length: dataLength,
    });

    const rowObj = this.bufferManager.tableBufferToObject(
      fileBuf,
      this.fileHandler.schemaObj[tablename],
    );
    return rowObj;
  }

  async getMatchedRows(
    tablename: string,
    columns: Array<string> | '*',
    where?: ExprRes | string,
    options?: {
      op: string;
      id: number;
    },
    orderBy?: Order,
  ) {
    if (
      !this.fileHandler.tables[tablename] ||
      !this.fileHandler.schemaObj[tablename]
    ) {
      throw new Error(`this table doesnt exist on current schema version`);
    }
    const indexCount = await this.tableHandler.getRowsCount(
      this.fileHandler.tables[tablename],
    );
    let startPos: number;
    let endPos: number;
    if (options && !isNaN(Number(options.id))) {
      if (options.op === '>' || options.op === '>=') {
        startPos = Math.max(options.id, 0);
        endPos = indexCount;
      } else if (options.op === '<' || options.op === '<=') {
        startPos = 0;
        endPos = Math.min(options.id, indexCount);
      } else if (options.op === '=') {
        if (options.id >= indexCount) return [];
        const rowObj = await this.readEqId(tablename, options.id);
        if (rowObj['deleted'] !== undefined) return [];
        return [this.objectFilter.filterObject(tablename, rowObj, columns)];
      } else {
        startPos = 0;
        endPos = indexCount;
      }
    } else {
      startPos = 0;
      endPos = indexCount;
    }
    //reading the rows by start and end of the indexes
    const rowsBuffer = await this.tableHandler.readRowsBuffer(
      this.fileHandler.tables[tablename],
      startPos,
      endPos,
    );
    //for each row we read and convert into a readable format
    const rowsObj: Array<Record<string, any>> = [];
    for (const row of rowsBuffer) {
      const rowObj = this.bufferManager.tableBufferToObject(
        { buffer: row, bytesRead: row.length },
        this.fileHandler.schemaObj[tablename],
      );
      if (rowObj['deleted']) {
        continue;
      }
      rowsObj.push(rowObj);
    }

    if (orderBy) {
      if (orderBy.column in rowsObj[0] || rowsObj.length === 0)
        rowsObj.sort((a, b) => {
          const aStr = String(a[orderBy.column]);
          const bStr = String(b[orderBy.column]);
          if (orderBy.asc) return aStr.localeCompare(bStr);
          else return aStr.localeCompare(bStr);
        });
      else
        throw new Error(
          `Reference Error: Couldn't find the relation ${orderBy.column}`,
        );
    }
    const resRows: Array<Record<string, any>> = [];
    for (const rowObj of rowsObj) {
      const filteredRowObj = this.objectFilter.filterObject(
        tablename,
        rowObj,
        columns,
      );

      if (!where) {
        resRows.push(filteredRowObj);
      } else if (this.math.compare(where, rowObj)) {
        resRows.push(filteredRowObj);
      }
    }

    return resRows;
  }

  async readIndexList(tablename: string, startPos: number, endPos: number) {
    const result: Array<{ index: bigint; rowLength: number }> = [];
    const bufObj = await this.fileHandler.tables[tablename].index.read({
      position: startPos * 12,
      length: endPos * 12 - startPos * 12,
    });
    for (let i = startPos; i < endPos; i++) {
      result.push(
        this.bufferManager.indexReader({
          buffer: bufObj.buffer.subarray(
            (i - startPos) * 12,
            (i - startPos) * 12 + 12,
          ),
          bytesRead: 12,
        }),
      );
    }
    return result;
  }

  async valueExists(
    tablename: string,
    column: string,
    value: string,
    ignoreId?: number,
  ) {
    const matches = await this.getMatchedRows(tablename, '*', {
      lhs: column,
      operator: '=',
      rhs: value,
    });
    if (matches.length && ignoreId) {
      if (matches.length === 1 && matches[0]['id'] === ignoreId) return false;
      return true;
    } else if (matches.length) return true;
    else return false;
  }

  async getRowHistory(tablename: string, id: number) {
    //recive one id and it will get the row by id then lets see what happens
    //lets loop through the versions
    const result: Array<object> = [];
    const row: dataVersions = await this.readEqId(tablename, id);
    let prevVersion: dataVersions = {
      prevVersion: row['prevVersion'],
      prevVersionSize: row['prevVersionSize'],
    };
    console.log(row);
    delete row['prevVersion'];
    delete row['prevVersionSize'];
    result.push(row);
    while (prevVersion['prevVersion'] !== undefined) {
      console.log(prevVersion);
      const buff = await this.fileHandler.tables[tablename].table.read({
        position: Number(prevVersion['prevVersion']),
        length: prevVersion['prevVersionSize'],
      });
      const rowObj: dataVersions = this.bufferManager.tableBufferToObject(
        buff,
        this.fileHandler.schemaObj[tablename],
      );
      prevVersion = {
        prevVersion: rowObj['prevVersion'],
        prevVersionSize: rowObj['prevVersionSize'],
      };
      delete rowObj['prevVersion'];
      delete rowObj['prevVersionSize'];
      result.push(rowObj);
    }
    return result;
  }
}
