import { Body, Controller, Get, Post } from '@nestjs/common';
import { SqlInterpreterService } from './sql-interpreter/sql-interpreter.service';
import { WinstonLoggerService } from './winston-logger/winston-logger.service';
import { StorageEngineService } from './storage-engine/storage-engine.service';
@Controller()
export class AppController {
  constructor(
    private interpreter: SqlInterpreterService,
    private winston: WinstonLoggerService,
    private storage: StorageEngineService,
  ) {}

  @Post('/execute/dml')
  async executeDML(@Body() body: string) {
    this.winston.logger.info(`[AppController]: recieved query: ${body}`);
    try {
      return {
        success: true,
        ...(await this.interpreter.interpretDML(body)),
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Post('/execute/ddl')
  async executeDDL(@Body() body: string) {
    try {
      return {
        success: true,
        ...(await this.interpreter.interpretDDL(body)),
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Get('/history')
  async getSchemaHistory() {
    try {
      return {
        success: true,
        data: await this.storage.getSchemaHistory(),
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  @Post('/version')
  async setSchemaVersion(@Body() body: { id: number }) {
    try {
      return {
        success: true,
        data: await this.storage.setSchemaVersion(body.id),
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  @Post('/data/history')
  async getDataHistory() {}
}
