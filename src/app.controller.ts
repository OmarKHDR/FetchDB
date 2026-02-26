import { Body, Controller, Get, Post } from '@nestjs/common';
import { SqlInterpreterService } from './sql-interpreter/sql-interpreter.service';
import { WinstonLoggerService } from './winston-logger/winston-logger.service';
@Controller()
export class AppController {
  constructor(
    private interpreter: SqlInterpreterService,
    private winston: WinstonLoggerService,
  ) {}

  @Post('/execute/dml')
  async executeDML(@Body() body: string) {
    this.winston.logger.info(`[AppController]: recieved query: ${body}`);
    try {
      return {
        success: true,
        message: await this.interpreter.interpretDML(body),
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Post('/execute/ddl')
  async executeDLL(@Body() body: string) {
    try {
      return {
        success: true,
        message: await this.interpreter.interpretDDL(body),
      };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Get('/history')
  async getQueryHistory() {}

  @Post('/data/history')
  async getDataHistory() {}
}
