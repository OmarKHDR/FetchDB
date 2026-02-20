import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
import { DbHandlerService } from '../db-handler/db-handler.service';
import { Column } from '../types/column.type';
import path from 'path';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';

@Injectable()
export class FileHandlerService {
  private schemaHandler: fs.FileHandle;
  private tables: Record<string, [fs.FileHandle, fs.FileHandle]> = {};
  constructor(
    private dbHandler: DbHandlerService,
    private winston: WinstonLoggerService,
  ) {}

  async onModuleInit() {
    const p = path.join(this.dbHandler.rootDir, 'schema.json');
    try {
      this.schemaHandler = await fs.open(p, 'wx+');
    } catch (err) {
      if (err.code === 'EEXIST') {
        this.winston.logger.info(`shcema file already exists`);
        this.schemaHandler = await fs.open(p, 'r+');
      } else throw err;
    }
    const tablenames = this.__readSchemaFile();
    for (const table in tablenames) {
      await this.__createTableFiles(table, 'open+');
    }
  }

  async __updateSchema(obj: Record<string, Column[]>) {
    const tables = await this.__readSchemaFile();
    for (const table in obj) {
      tables[table] = obj[table];
    }
    const data = JSON.stringify(tables);
    try {
      await this.schemaHandler.truncate(0);
      await this.schemaHandler.writeFile(data);
    } catch (err) {
      this.winston.logger.error(
        `this is your schema: ${data}, sorry for deleting your db error: ${err}`,
      );
    }
  }
  async __createTableFiles(tablename: string, mode: string) {
    const tablefd = await fs.open(
      path.join(this.dbHandler.rootDir, `${tablename}.data`),
      'a+',
    );
    const indexfd = await fs.open(
      path.join(this.dbHandler.rootDir, `${tablename}.index`),
      'a+',
    );
    switch (mode) {
      case 'create':
        if (this.tables[tablename]) throw Error(`file already exists`);
        break;
      case 'open+':
        this.tables[tablename] = [tablefd, indexfd];
        break;
      default:
        this.tables[tablename] = [tablefd, indexfd];
        break;
    }
  }

  async __readSchemaFile() {
    const tablenames =
      (await this.schemaHandler.readFile({ encoding: 'utf-8' })) || '{}';
    return JSON.parse(tablenames) as Record<string, Column[]>;
  }

  async createNewTable(tablename: string, tableSchema: Column[]) {
    const tableObj: Record<string, Column[]> = {};
    tableObj[tablename] = tableSchema;
    try {
      // open files then add the file descriptors to the tables
      await this.__createTableFiles(tablename, 'create');
    } catch (err) {
      throw new Error(`couldn't create table file: ${err}`);
    }
    //adds those created tables into the schema.json file (rewrite the entire file each time)
    await this.__updateSchema(tableObj);
  }
}
