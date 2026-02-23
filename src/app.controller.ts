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
    return await this.interpreter.interpret(body);
  }

  @Post('/execute/dll')
  async executeDLL() {}

  @Get('/history')
  async getQueryHistory() {}

  @Post('/data/history')
  async getDataHistory() {}
}
