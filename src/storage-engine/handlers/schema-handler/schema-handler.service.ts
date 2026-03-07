import { Injectable } from '@nestjs/common';
import { Column } from 'src/storage-engine/types/column.type';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { MutexService } from 'src/storage-engine/mutex/mutex.service';
import { BufferManagerService } from 'src/storage-engine/buffer-manager/buffer-manager.service';
import { TableHandlerService } from '../table-handler.service.ts/table-handler.service';
import { SchemaHandle, TableHandle, Tables } from '../../types/handlers.types';

@Injectable()
export class SchemaHandlerService {
  constructor(
    private winston: WinstonLoggerService,
    private mutex: MutexService,
    private bufferManager: BufferManagerService,
    private tableHandler: TableHandlerService,
  ) {}

  async getAllSchema(schema: SchemaHandle) {
    const end = await this.getLatestVersion(schema);
    const start = 0;

    const schemaArray = await this.tableHandler.readRowsBuffer(
      schema,
      start,
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

  async updateSchema(
    newTables: Record<string, Column[]>,
    schema: SchemaHandle,
    tables: Tables,
  ) {
    const oldSchema = await this.readSchema(schema);
    for (const table in newTables) {
      if (table in oldSchema) throw new Error('table already exists');
      oldSchema[table] = newTables[table];
      for (const column of oldSchema[table]) {
        if (column.type === 'serial') {
          column.serial = await this.tableHandler.getRowsCount(tables[table]);
          this.winston.info(
            `setting the column ${column.name} start to ${column.serial}`, 'SchemaHandler'
          );
        }
      }
    }
    const data = JSON.stringify(oldSchema);
    await this.tableHandler.saveToTable(Buffer.from(data), schema);
    this.winston.info(`new schema version is created: ${data}`, 'SchemaHandler');
    await this.updateVersion(schema);
    return oldSchema;
  }

  async updateVersion(schema: SchemaHandle) {
    if (schema.version === undefined) await this.getLatestVersion(schema);
    (schema.version as number) += 1;
  }

  async getLatestVersion(schema: SchemaHandle) {
    let version = Math.trunc(
      (await this.tableHandler.getTableSize(schema.index)) / 12,
    );
    return version;
  }

  async setSchemaVersion(schema: SchemaHandle, v: number) {
    if (v > (await this.getLatestVersion(schema))) {
      throw new Error(
        `trying to set schema version to higher than the latest version`,
      );
    }
    const versionedSchema = await this.readSchema(schema, v);
    schema.version = v;
    return versionedSchema;
  }

  async getSchemaVersion(schema: SchemaHandle) {
    if (schema.version === undefined)
      schema.version = await this.getLatestVersion(schema);
    return schema.version;
  }

  async readSchema(schema: SchemaHandle, version?: number) {
    if (version === 0)
      throw new Error(`do you want to delete the db or something?!`);
    version = version ?? (await this.getSchemaVersion(schema));
    if (schema.version === 0) return {} as Record<string, Array<Column>>;
    const indexOffset: number = (version - 1) * 12;
    const buf: { buffer: Buffer; bytesRead: number } = await schema[
      'index'
    ].read({
      position: indexOffset,
      length: 12,
    });
    const dataOffset = Number(buf.buffer.readBigInt64LE(0));
    const dataLength = Number(buf.buffer.readInt32LE(8));
    const fileBuf = await schema['schema'].read({
      position: dataOffset,
      length: dataLength,
    });

    return JSON.parse(
      fileBuf.buffer.toString('utf-8', 0, fileBuf.bytesRead) || '{}',
    ) as Record<string, Array<Column>>;
  }
}
