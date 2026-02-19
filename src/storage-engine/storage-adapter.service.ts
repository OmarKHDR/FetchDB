import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './file-handler/file-handler.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import path from 'path';

@Injectable()
export class StorageAdapterService {
  private readonly schemas;
  dbname: string | null = null;
  constructor(
    private fileHandler: FileHandlerService,
    private winston: WinstonLoggerService,
  ) {}

  async readSchema() {
    const schemaPath = path.join(this.db_handler.rootDir, 'schema.json');
    const schema = await this.fileHandler.readComplete(schemaPath);
    const schemaObj = this.compileSchema(schema);
    return schemaObj;
  }

  compileSchema(schema: string) {
    return JSON.parse(schema) as Schema;
  }

  writeSchema(schema: string) {
    const schemaPath = path.join(this.db_handler.rootDir, 'schema.json');
    return this.fileHandler.rewriteData(schemaPath, schema);
  }
}
