import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { DbHandlerService } from '../db-handler/db-handler.service';
import { Column } from '../types/column.type';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
import { MutexService } from '../mutex/mutex.service';
import { BufferManagerService } from '../buffer-manager/buffer-manager.service';
import { ExprRes, MathService } from 'src/parser/math/math.service';
import { dataVersions } from '../types/versions.type';
import { ValidatorService } from 'src/storage-engine/helper/validator.service';
import { StorageStrategyService } from '../storage-strategy/storage-strategy.service';
import { ObjectHandlerService } from '../helper/object-handler.service';

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
    private bufferHandler: BufferManagerService,
    private winston: WinstonLoggerService,
    private mutex: MutexService,
    private math: MathService,
    private validator: ValidatorService,
    private storageStrategy: StorageStrategyService,
    private objectHandler: ObjectHandlerService,
  ) {}

  async onModuleInit() {
    this.winston.info(`shcema file already exists`);
    this.schema = await this.storageStrategy.createSchemaFiles(
      this.dbHandler.rootDir,
    );
    this.schemaVersion = await this.getLatestVersion();
    this.winston.info(
      `current schema version: ${this.schemaVersion}`,
      'FileHandler',
    );
    this.schemaObj = await this.readSchema();
    for (const table in this.schemaObj) {
      this.tables[table] = await this.storageStrategy.openTable(
        this.dbHandler.rootDir,
        table,
      );
      for (const column of this.schemaObj[table]) {
        if (column.type === 'serial') {
          column.serial = Math.trunc(
            (await this.tables[table].index.stat()).size / 12,
          );
          this.winston.info(
            `setting the column ${column.name} start to ${column.serial}`,
          );
        }
      }
    }
    // await this.cleanDB();
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
      }
    }
  }

  async getAllSchema() {
    const end = await this.getLatestVersion();
    const bufObj = await this.schema.index.read({
      position: 0 * 12,
      length: end * 12,
    });
    const schemaArray = await this.storageStrategy.readRowsFromIndexBuffer(
      bufObj,
      this.schema.schema,
      end,
      12,
    );
    const schemas: Array<Record<string, Array<Column>>> = [];
    for (const schemaBuff of schemaArray) {
      schemas.push(
        JSON.parse(schemaBuff.toString('utf-8') || '{}') as Record<
          string,
          Array<Column>
        >,
      );
    }
    return schemas;
  }

  async updateSchema(obj: Record<string, Column[]>) {
    const tables = await this.readSchema();
    for (const table in obj) {
      if (table in tables) throw new Error('table already exists');
      tables[table] = obj[table];
      for (const column of tables[table]) {
        if (column.type === 'serial') {
          column.serial =
            (await this.storageStrategy.getTableSize(
              this.tables[table].index,
            )) / 12;
          this.winston.info(
            `setting the column ${column.name} start to ${column.serial}`,
          );
        }
      }
    }
    const data = JSON.stringify(tables);
    this.schemaObj = tables;

    const b = this.bufferHandler.getAllocatedBuffer(0, 12);
    b.writeInt32LE(data.length, 8);
    const resolver = await this.mutex.acquireMutex('schemahandler');
    try {
      const dataOffset = await this.storageStrategy.getTableSize(
        this.schema.schema,
      );
      b.writeBigInt64LE(BigInt(dataOffset));
      await this.schema['schema'].appendFile(data);
      await this.schema['index'].appendFile(b);
      this.updateVersion(1);
    } catch (err) {
      this.winston.error(`${err}`, 'FileHandler');
    } finally {
      resolver('finaly');
    }
  }

  updateVersion(steps: number) {
    this.schemaVersion += steps;
  }

  getSchemaVersion() {
    return this.schemaVersion;
  }

  async setSchemaVersion(v: number) {
    this.schemaObj = await this.readSchema(v);
  }

  async getLatestVersion() {
    return Math.trunc(
      (await this.storageStrategy.getTableSize(this.schema.index)) / 12,
    );
  }

  async readSchema(version?: number) {
    if (version === 0) throw new Error(`wdym by version 0 bro?!`);
    if (this.schemaVersion === 0) return {} as Record<string, Array<Column>>;
    const indexOffset: number = ((version ?? this.schemaVersion) - 1) * 12;
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
      this.tables[tablename] = await this.storageStrategy.openTable(
        this.dbHandler.rootDir,
        tablename,
      );
      await this.updateSchema(tableObj);
    } catch (err) {
      await this.tables[tablename].table.close();
      await this.tables[tablename].index.close();
      delete this.tables[tablename];
      throw new Error(`couldn't create table file: ${err}`);
    }
    return tableObj;
  }

  async getTableBuffer(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    if (!this.tables[tablename] || !this.schemaObj[tablename])
      throw new Error(`table ${tablename} doesn't exists`);
    const row: Record<string, string> = {};
    if (!columns || !columns.length) {
      if (values.length !== this.schemaObj[tablename].length) {
        throw new Error(`inserted data doesn't match table schema`);
      } else {
        // no names provided for columns and columns matches schema
        let i = 0;
        for (const column of this.schemaObj[tablename]) {
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
      for (const column of this.schemaObj[tablename]) {
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
    return this.bufferHandler.dataToTableBuffer(
      row,
      {},
      this.schemaObj[tablename],
    );
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
    } else return false;
  }

  async writeToTable(
    tablename: string,
    values: Array<string>,
    columns?: Array<string>,
  ) {
    const buffer = await this.getTableBuffer(tablename, values, columns);
    const resolver = await this.mutex.acquireMutex(tablename);
    try {
      const dataOffset = await this.storageStrategy.getTableSize(
        this.tables[tablename].table,
      );
      const b = this.bufferHandler.getAllocatedBuffer(0, 12);
      b.writeBigInt64LE(BigInt(dataOffset));
      b.writeInt32LE(buffer.length, 8);
      await this.tables[tablename].table.appendFile(buffer);
      await this.tables[tablename].index.appendFile(b);
    } catch (err) {
      this.winston.error(`${err}`, 'FileHandler');
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
      const obj = this.bufferHandler.tableBufferToObject(
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
    if (id < 0)
      throw new Error(`Type Violation: the SERIAL id can't go below zero`);
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

    const rowObj = this.bufferHandler.tableBufferToObject(
      fileBuf,
      this.schemaObj[tablename],
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
  ) {
    if (!this.tables[tablename] || !this.schemaObj[tablename]) {
      throw new Error(`this table doesnt exist on current schema version`);
    }
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
        endPos = Math.min(options.id, indexCount);
      } else if (options.op === '=') {
        if (options.id >= indexCount) return [];
        const rowObj = await this.readEqId(tablename, options.id);
        if (rowObj['deleted'] !== undefined) return [];
        return [this.objectHandler.filterObject(tablename, rowObj, columns)];
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
      const rowObj = this.bufferHandler.tableBufferToObject(
        row,
        this.schemaObj[tablename],
      );
      if (rowObj['deleted']) {
        continue;
      }
      this.winston.info(`Column to check:`);
      console.log(rowObj);
      const filteredRowObj = this.objectHandler.filterObject(
        tablename,
        rowObj,
        columns,
      );
      this.winston.info(`filtered column:`);
      console.log(filteredRowObj);
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
    const bufObj = await this.tables[tablename].index.read({
      position: startPos * 12,
      length: endPos * 12 - startPos * 12,
    });
    for (let i = startPos; i < endPos; i++) {
      result.push(
        this.bufferHandler.indexReader({
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
  async updateRows(
    tablename: string,
    where: ExprRes | string | undefined,
    columns: Array<string>,
    values: Array<string>,
  ) {
    this.winston.info(`trying to update columns`);
    //for each matched row we will update the values of the object, then append values, and change the prevVersion, prevVersionSize, and the index info
    const rows = await this.getMatchedRows(tablename, '*', where);

    const updatedRows: Array<object> = [];
    const resolver = await this.mutex.acquireMutex(tablename);
    try {
      for (const row of rows) {
        const oldRow = { ...row };
        const index = await this.readIndexList(
          tablename,
          Number(row['id']),
          Number(row['id']) + 1,
        );
        for (const column of this.schemaObj[tablename]) {
          const valIndex = columns.indexOf(column.name);
          if (valIndex === -1) continue;
          if (column.name === 'id')
            throw new Error(`Violation of DB design, cannot change the id`);
          const exists = await this.valueExists(
            tablename,
            column.name,
            values[valIndex],
            Number(row['id']),
          );
          this.validator.constraintsValidator(column, values[valIndex], exists);
          row[column.name] = values[valIndex];
        }

        const buff = this.bufferHandler.dataToTableBuffer(
          row as Record<string, string>,
          oldRow,
          this.schemaObj[tablename],
          index[0].index,
          index[0].rowLength,
        );
        const dataOffset = (await this.tables[tablename].table.stat()).size;
        await this.tables[tablename].table.appendFile(buff);
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
    const b = this.bufferHandler.getAllocatedBuffer(0, 12);
    b.writeBigInt64LE(offset);
    b.writeInt32LE(buff.length, 8);
    await this.tables[tablename].index.write(b, 0, 12, id * 12);
  }

  async deleteRow(tablename: string, where: ExprRes | string) {
    if (where === undefined)
      throw new Error(`delete statement must have WHERE filter`);
    const rows = await this.getMatchedRows(tablename, '*', where);
    const updatedRows: Array<object> = [];
    for (const row of rows) {
      // going to the index get past size and pos
      // that makes it getting the whole index 12 byte to append to the buffer, so we dont need to calculate past data
      // only replace the current index with the current row
      const resolver = await this.mutex.acquireMutex(tablename);
      try {
        const index = await this.readIndexList(
          tablename,
          Number(row['id']),
          Number(row['id']) + 1,
        );
        const buff = this.bufferHandler.dataToTableBuffer(
          row,
          {},
          this.schemaObj[tablename],
          index[0].index,
          index[0].rowLength,
          true,
        );
        const dataOffset = (await this.tables[tablename].table.stat()).size;
        await this.tables[tablename].table.appendFile(buff);
        await this.replaceIndex(
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
      const buff = await this.tables[tablename].table.read({
        position: Number(prevVersion['prevVersion']),
        length: prevVersion['prevVersionSize'],
      });
      const rowObj: dataVersions = this.bufferHandler.tableBufferToObject(
        buff,
        this.schemaObj[tablename],
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
