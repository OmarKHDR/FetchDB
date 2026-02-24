import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { DbHandlerService } from '../db-handler/db-handler.service';
import { Column } from '../types/column.type';
import path from 'path';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
import { MutexService } from '../mutex/mutex.service';
import { TableHandlerService } from '../table-reader/table-handler.service';
import { buffer } from 'stream/consumers';

@Injectable()
export class FileHandlerService {
  schemaPath: string;
  private schemaObj: Record<string, Array<Column>>;
  private tables: Record<
    string,
    { table: fs.FileHandle; index: fs.FileHandle }
  > = {};
  constructor(
    private dbHandler: DbHandlerService,
    private tableHandler: TableHandlerService,
    private winston: WinstonLoggerService,
    private mutex: MutexService,
  ) {
    this.schemaPath = path.join(this.dbHandler.rootDir, 'schema.json');
  }

  async onModuleInit() {
    this.winston.logger.info(`shcema file already exists`);
    try {
      await fs.access(this.schemaPath);
    } catch {
      await fs.writeFile(this.schemaPath, '{}', 'utf-8');
    }
    this.schemaObj = await this.__readSchemaFile();
    for (const table in this.schemaObj) {
      this.tables[table] = await this.__openTable(table);
    }
  }

  async __openTable(tablename) {
    const tablePath = path.join(this.dbHandler.rootDir, `${tablename}.data`);
    const indexPath = path.join(this.dbHandler.rootDir, `${tablename}.index`);
    const tablefd = await this.createFileIfNotExists(tablePath);
    const indexfd = await this.createFileIfNotExists(indexPath);
    if (!tablefd || !indexfd)
      throw new Error(`couldn't open the table: ${tablename}`);
    return {
      table: tablefd,
      index: indexfd,
    };
  }
  async createFileIfNotExists(filepath: string) {
    try {
      const filehandler = await fs.open(filepath, 'a+');
      return filehandler;
    } catch (err) {
      this.winston.logger.error(err);
      throw err;
    }
  }

  async __updateSchema(obj: Record<string, Column[]>) {
    const tables = await this.__readSchemaFile();

    for (const table in obj) {
      tables[table] = obj[table];
    }
    const data = JSON.stringify(tables);
    const resolver = await this.mutex.acquireMutex('schema.json');
    try {
      const tmpfile = path.join(this.dbHandler.rootDir, 'schema.tmp.json');
      await fs.writeFile(tmpfile, data);
      await fs.rename(tmpfile, this.schemaPath);
    } catch (err) {
      this.winston.logger.error(`this is your schema: ${data} error: ${err}`);
    } finally {
      resolver('hello');
    }
  }

  async __readSchemaFile() {
    const resolver = await this.mutex.acquireMutex('schema.json');
    let data: string;
    try {
      data = await fs.readFile(this.schemaPath, 'utf-8');
    } finally {
      resolver('hi');
    }
    return JSON.parse(data || '{}') as Record<string, Column[]>;
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
  }

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
          row[column.name] = values[i++];
        }
      }
    } else {
      //column names were provided, so we need to loop through columns in schema if the name
      // matches column name then we add the value, if not then we add the default or throw if its not nullable
      //assuming in order input with the schema
      for (const column of this.schemaObj[tablename]) {
        if (columns.includes(column.name)) {
          const index = columns.indexOf(column.name);
          row[column.name] = values[index];
        } else {
          // column doesnt exists on the inserted columns ->
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
      const b = this.tableHandler.getAllocatedBuffer(0, 8);
      b.writeBigInt64LE(BigInt(dataOffset));
      await this.tables[tablename].index.appendFile(b);
      await this.tables[tablename].table.appendFile(buffer);
    } catch (err) {
      this.winston.logger.error(err);
    } finally {
      resolver('finish');
    }
  }

  async readById(tablename: string, id: number) {
    const offset = id * 8;
    const resolver = await this.mutex.acquireMutex(tablename);
    let dataOffset: number = 0;
    let dataLength: number = 0;
    try {
      const rowCount = (await this.tables[tablename].index.stat()).size / 8;
      let buf: { buffer: Buffer; bytesRead: number };
      if (rowCount > id - 1) {
        buf = await this.tables[tablename].index.read({
          offset,
          length: 16,
        });
        dataOffset = Number(buf.buffer.readBigInt64LE(0));
        dataLength = Number(buf.buffer.readBigInt64LE(8)) - dataOffset;
      } else if (rowCount === id) {
        buf = await this.tables[tablename].index.read({
          offset,
          length: 8,
        });
        dataOffset = Number(buf.buffer.readBigInt64LE(0));
        dataLength =
          (await this.tables[tablename].table.stat()).size - dataOffset;
      }
    } finally {
      resolver('finish');
    }
    const fileBuf = await this.tables[tablename].table.read({
      offset: Number(dataOffset),
      length: dataLength,
    });
    return this.tableHandler.tableBufferToObject(
      fileBuf,
      this.schemaObj[tablename],
    );
  }
}
