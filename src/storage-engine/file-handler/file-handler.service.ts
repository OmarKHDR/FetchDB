import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { DbHandlerService } from '../db-handler/db-handler.service';
import { Column } from '../types/column.type';
import path from 'path';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
import { MutexService } from '../mutex/mutex.service';
import { TableHandlerService } from '../table-reader/table-handler.service';
import { ExprRes } from 'src/parser/math/math.service';
import { validateHeaderValue } from 'http';

@Injectable()
export class FileHandlerService {
  private schemaObj: Record<string, Array<Column>>;
  private schema: { schema: fs.FileHandle; index: fs.FileHandle };
  private schemaVersion: number;
  private tables: Record<
    string,
    { table: fs.FileHandle; index: fs.FileHandle }
  > = {};
  constructor(
    private dbHandler: DbHandlerService,
    private tableHandler: TableHandlerService,
    private winston: WinstonLoggerService,
    private mutex: MutexService,
  ) {}

  async onModuleInit() {
    this.winston.logger.info(`shcema file already exists`);
    this.schema = await this.createSchemaFiles();
    this.schemaVersion = await this.getLatestVersion();
    this.schemaObj = await this.__readSchemaFile();
    for (const table in this.schemaObj) {
      this.tables[table] = await this.__openTable(table);
    }
    await this.cleanDB();
  }
  async onModuleDistroy() {
    for (const table in this.tables) {
      await this.tables[table].table.close();
      await this.tables[table].index.close();
    }
    await this.schema.index.close();
    await this.schema.schema.close();
  }

  async cleanDB() {
    for (const table in this.tables) {
      const indexFileSize = (await this.tables[table].index.stat()).size;
      if (indexFileSize === 0) continue;
      if (indexFileSize % 12 !== 0) {
        await this.tables[table].index.truncate(
          indexFileSize - (indexFileSize % 12),
        );
        continue;
      }
      const lastIndex = await this.tables[table].index.read({
        position: (indexFileSize / 12 - 1) * 12,
        length: 12,
      });
      const index = this.tableHandler.indexReader(lastIndex);
      const tableSize = (await this.tables[table].table.stat()).size;
      if (Number(index.index) + index.rowLength !== tableSize) {
        await this.tables[table].index.truncate(indexFileSize - 12);
        await this.tables[table].table.truncate(Number(index.index));
      }
    }
  }

  async createSchemaFiles() {
    const schemaPath = path.join(this.dbHandler.rootDir, `schema.vjson`);
    const schemaIndexPath = path.join(this.dbHandler.rootDir, `schema.index`);
    const schemafd = await this.createFileIfNotExists(schemaPath);
    const indexfd = await this.createFileIfNotExists(schemaIndexPath);
    if (!schemafd || !indexfd) throw new Error(`couldn't open the schema file`);
    return {
      schema: schemafd,
      index: indexfd,
    };
  }
  async __openTable(tablename: string) {
    const tablePath = path.join(this.dbHandler.rootDir, `${tablename}.data`);
    const indexPath = path.join(this.dbHandler.rootDir, `${tablename}.index`);
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
  async createFileIfNotExists(filepath: string, mode = 'a+') {
    try {
      const filehandler = await fs.open(filepath, mode);
      return filehandler;
    } catch (err) {
      this.winston.logger.error(err);
      throw err;
    }
  }

  async __updateSchema(obj: Record<string, Column[]>) {
    const tables = await this.__readSchemaFile();
    for (const table in obj) {
      if (table in tables) throw new Error('table already exists');
      tables[table] = obj[table];
    }
    const data = JSON.stringify(tables);
    this.schemaObj = tables;
    const b = this.tableHandler.getAllocatedBuffer(0, 12);
    b.writeInt32LE(data.length, 8);
    const resolver = await this.mutex.acquireMutex('schemahandler');
    try {
      const dataOffset = (await this.schema['schema'].stat()).size;
      b.writeBigInt64LE(BigInt(dataOffset));
      await this.schema['schema'].appendFile(data);
      await this.schema['index'].appendFile(b);
      this.updateVersion(1);
    } catch (err) {
      this.winston.logger.error(err);
    } finally {
      resolver('finaly');
    }
  }

  updateVersion(steps: number) {
    this.schemaVersion += steps;
  }

  async getLatestVersion() {
    return Math.trunc((await this.schema['index'].stat()).size / 12);
  }

  async __readSchemaFile() {
    console.log(` schema version: ${this.schemaVersion}`);
    if (this.schemaVersion === 0) return {} as Record<string, Array<Column>>;
    const indexOffset: number = (this.schemaVersion - 1) * 12;
    const buf: { buffer: Buffer; bytesRead: number } = await this.schema[
      'index'
    ].read({
      position: indexOffset,
      length: 12,
    });
    const dataOffset = Number(buf.buffer.readBigInt64LE(0));
    const dataLength = Number(buf.buffer.readInt32LE(8));
    const fileBuf = await this.schema['schema'].read({
      position: dataOffset,
      length: dataLength,
    });

    return JSON.parse(
      fileBuf.buffer.toString('utf-8', 0, fileBuf.bytesRead) || '{}',
    ) as Record<string, Array<Column>>;
  }

  async createNewTable(tablename: string, tableSchema: Column[]) {
    const tableObj: Record<string, Column[]> = {};
    tableObj[tablename] = tableSchema;
    try {
      this.tables[tablename] = await this.__openTable(tablename);
    } catch (err) {
      throw new Error(`couldn't create table file: ${err}`);
    }
    await this.__updateSchema(tableObj);
    return tableObj;
  }

  validateValue() {}

  __getTableBuffer(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    if (!this.tables[tablename])
      throw new Error(`table ${tablename} doesn't exists`);
    const row: Record<string, string> = {};
    if (!columns || !columns.length) {
      if (values.length !== this.schemaObj[tablename].length) {
        throw new Error(`inserted data doesn't match table schema`);
      } else {
        // no names provided for columns and columns matches schema
        let i = 0;
        for (const column of this.schemaObj[tablename]) {
          this.validateValue(column.type, values[i]);
          if (column.IsUnique) {
            if (this.valueExists(tablename, column.name, values[i])) {
              throw new Error(`[StorageEngine] Unique constraints violation`);
            }
          }
          row[column.name] = values[i++];
        }
      }
    } else {
      for (const column of this.schemaObj[tablename]) {
        if (columns.includes(column.name)) {
          const index = columns.indexOf(column.name);
          this.validateValue(column.type, values[index]);
          row[column.name] = values[index];
        } else {
          if (column.default) row[column.name] = column.default;
          else if (!column.IsNullable) {
            throw new Error(`value for column ${column.name} must be setten`);
          } else {
            row[column.name] = 'null';
          }
        }
      }
    }
    return this.tableHandler.dataToTableBuffer(row, this.schemaObj[tablename]);
  }

  async writeToTable(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    const buffer = this.__getTableBuffer(tablename, values, columns);
    const resolver = await this.mutex.acquireMutex(tablename);
    try {
      const dataOffset = (await this.tables[tablename].table.stat()).size;
      const b = this.tableHandler.getAllocatedBuffer(0, 12);
      b.writeBigInt64LE(BigInt(dataOffset));
      b.writeInt32LE(buffer.length, 8);
      //write to table first then index so we dont ruin the index file
      // if write fails midway we need to detect that, so we can create a clean with each startup checks last
      // row if it has valid index or not
      await this.tables[tablename].table.appendFile(buffer);
      await this.tables[tablename].index.appendFile(b);
    } catch (err) {
      this.winston.logger.error(err);
    } finally {
      resolver('finish');
    }
    return {
      tablename,
      values,
      columns,
    };
  }

  async loadRowList(
    tablename: string,
    start: bigint,
    end: bigint,
    sizes: Array<number>,
  ) {
    const bufObj = await this.tables['tablename'].table.read({
      position: start,
      length: Number(end - start),
    });
    let s = 0;
    const result: Array<Record<string, string>> = [];
    for (const size of sizes) {
      const obj = this.tableHandler.tableBufferToObject(
        {
          buffer: bufObj.buffer.subarray(s, s + size),
          bytesRead: size,
        },
        this.schemaObj[tablename],
      );
      s += size;
      result.push(obj);
      if (s >= bufObj.bytesRead) break;
    }
    return result;
  }
  async readEqId(tablename: string, id: number) {
    if (id < 0) throw new Error(`[StorageEngine]: the id can't go below zero`);
    const indexOffset = id * 12;

    const buf: { buffer: Buffer; bytesRead: number } = await this.tables[
      tablename
    ].index.read({
      position: indexOffset,
      length: 12,
    });
    const dataOffset = Number(buf.buffer.readBigInt64LE(0));
    const dataLength = Number(buf.buffer.readInt32LE(8));
    if (dataLength === 0) return {};
    const fileBuf = await this.tables[tablename].table.read({
      position: dataOffset,
      length: dataLength,
    });

    return this.tableHandler.tableBufferToObject(
      fileBuf,
      this.schemaObj[tablename],
    );
  }

  async getMatchedRows(
    tablename: string,
    where?: ExprRes | string,
    options?: {
      op: string;
      id: number;
    },
  ) {
    const indexCount = Math.trunc(
      (await this.tables[tablename].index.stat()).size / 12,
    );
    let startPos: number;
    let endPos: number;
    if (options && !isNaN(Number(options.id))) {
      if (options.op === '>' || options.op === '>=') {
        startPos = Math.max(options.id, 0);
        endPos = indexCount;
      } else if (options.op === '<' || options.op === '<=') {
        startPos = 0;
        endPos = Math.min(options.id, indexCount * 12);
      } else if (options.op === '=') {
        if (options.id >= indexCount)
          throw new Error(
            `[StorageEngine]: max id was exceded current max id is: ${indexCount - 1}`,
          );
        return [await this.readEqId(tablename, options.id)];
      } else {
        startPos = 0;
        endPos = indexCount;
      }
    } else {
      startPos = 0;
      endPos = indexCount;
    }
    let indexes = await this.readIndexList(tablename, startPos, endPos);
    indexes = indexes.sort((a, b) => {
      return Number(a.index - b.index);
    });
    const resRows: Array<object> = [];
    for (const index of indexes) {
      const row = await this.tables[tablename].table.read({
        position: index.index,
        length: index.rowLength,
      });
      const rowObj = this.tableHandler.tableBufferToObject(
        row,
        this.schemaObj[tablename],
      );
      if (!where) {
        resRows.push(rowObj);
      } else if (this.compare(where, rowObj)) {
        resRows.push(rowObj);
      }
    }
    return resRows;
  }

  compare(where: ExprRes | string, rowObj: Record<string, string>) {
    if (typeof where === 'string') {
      const typed = this.convertToType(where);
      if (typed.type === 'column') {
        if (!(typed.value in rowObj)) {
          throw new Error(`can't find relation ${typed.value}`);
        }
        if (
          typeof rowObj[typed.value] === 'string' &&
          (rowObj[typed.value].startsWith('"') ||
            rowObj[typed.value].startsWith("'"))
        ) {
          return rowObj[typed.value].slice(1, rowObj[typed.value].length - 1);
        }
        return Number(rowObj[typed.value]);
      }
      return typed.value;
    }
    const left = this.compare(where.lhs, rowObj);
    const right = this.compare(where.rhs, rowObj);
    switch (where.operator) {
      case '=':
        return left === right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case 'and':
        return (left && right) as boolean;
      case 'or':
        return (left || right) as boolean;
      case 'not':
        return !right;
      case '+':
        return (left + right) as number;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      default:
        throw new Error('this operator wasnt implemented yet');
    }
  }
  convertToType(str: string) {
    if (str.startsWith('"') || str.startsWith("'")) {
      return { value: str.slice(1, str.length - 1), type: 'string' };
    } else if (!isNaN(Number(str))) {
      return { value: Number(str), type: 'number' };
    } else {
      return { value: str, type: 'column' };
    }
  }
  async readIndexList(tablename: string, startPos: number, endPos: number) {
    const result: Array<{ index: bigint; rowLength: number }> = [];
    const bufObj = await this.tables[tablename].index.read({
      position: startPos * 12,
      length: endPos * 12 - startPos * 12,
    });
    for (let i = startPos; i < endPos; i++) {
      result.push(
        this.tableHandler.indexReader({
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
  updateRows() {}
}
