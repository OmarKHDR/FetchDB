/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import path from 'path';
import fs from 'fs/promises';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DbHandlerService {
  readonly rootDir: string = path.join(process.cwd(), 'data');
  readonly schemaFilePath: string = path.join(this.rootDir, 'schema.json');
  constructor(private winston: WinstonLoggerService) {
    this.setupDataDirectory().catch(() => {});
  }

  async setupDataDirectory() {
    try {
      await fs.mkdir(this.rootDir);
    } catch (err) {
      this.winston.logger.error(err);
    }
  }
}
