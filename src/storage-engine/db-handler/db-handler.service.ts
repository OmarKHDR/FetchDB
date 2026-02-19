/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import path from 'path';
import fs from 'fs/promises';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DbHandlerService {
  readonly rootDir: string = path.join(process.cwd(), 'data');
  constructor(private winston: WinstonLoggerService) {
    this.setupDataDirectory(this.rootDir).catch(() => {});
  }

  async setupDataDirectory(root: string) {
    try {
      await fs.mkdir(root);
    } catch (err) {
      this.winston.logger.error(err);
    }
  }
}
