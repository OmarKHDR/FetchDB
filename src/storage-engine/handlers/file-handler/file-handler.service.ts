import { Injectable } from '@nestjs/common';
import { DbHandlerService } from '../db-handler/db-handler.service';
import { Column } from '../../types/column.type';
import { WinstonLoggerService } from '../../../winston-logger/winston-logger.service';
import { SchemaHandlerService } from '../schema-handler/schema-handler.service';
import { SchemaHandle, Tables } from 'src/storage-engine/types/handlers.types';
import { TableHandlerService } from '../table-handler.service.ts/table-handler.service';

@Injectable()
export class FileHandlerService {
  schemaObj: Record<string, Array<Column>>;
  schema: SchemaHandle;
  tables: Tables = {};
  constructor(
    private dbHandler: DbHandlerService,
    private winston: WinstonLoggerService,
    private schemaHandler: SchemaHandlerService,
    private tableHandler: TableHandlerService,
  ) {}

  async onModuleInit() {
    this.winston.info(`shcema file already exists`);
    this.schema = await this.tableHandler.createSchemaFiles(
      this.dbHandler.rootDir,
    );
    const schemaVersion = await this.schemaHandler.getLatestVersion(this.schema);
    this.winston.info(
      `current schema version: ${schemaVersion}`,
      'FileHandler',
    );
    this.schemaObj = await this.schemaHandler.readSchema(this.schema);
    for (const table in this.schemaObj) {
      this.tables[table] = await this.tableHandler.openTable(
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
    return await this.schemaHandler.getAllSchema(this.schema);
  }

  async getSchemaVersion() {
    return await this.schemaHandler.getSchemaVersion(this.schema);
  }
  async setSchemaVersion(version: number) {
    this.schemaObj = await this.schemaHandler.setSchemaVersion(
      this.schema,
      version,
    );
    this.winston.info(`Setting schema version into ${version}, the schema:`);
    console.log(this.schemaObj);
  }

  async createNewTable(tablename: string, tableSchema: Column[]) {
    const newTableObj: Record<string, Column[]> = {};
    newTableObj[tablename] = tableSchema;
    try {
      this.tables[tablename] = await this.tableHandler.openTable(
        this.dbHandler.rootDir,
        tablename,
      );
      this.schemaObj = await this.schemaHandler.updateSchema(
        newTableObj,
        this.schema,
        this.tables,
      );
      console.log(this.schemaObj)


    } catch (err) {
      await this.tables[tablename].table.close();
      await this.tables[tablename].index.close();
      delete this.tables[tablename];
      throw new Error(`couldn't create table file: ${err}`);
    }
    return newTableObj;
  }

}
