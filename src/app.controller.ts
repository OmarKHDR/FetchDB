import { Body, Controller, Get, Post } from '@nestjs/common';
import { SqlInterpreterService } from './sql-interpreter/sql-interpreter.service';
import { WinstonLoggerService } from './winston-logger/winston-logger.service';
import { StorageEngineService } from './storage-engine/storage-engine.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { selectRowDto, setVersionDto } from './shared/dto/history.dto';

@Controller()
export class AppController {
  constructor(
    private interpreter: SqlInterpreterService,
    private winston: WinstonLoggerService,
    private storage: StorageEngineService,
  ) {}

  @ApiConsumes('text/plain')
  @ApiOperation({
    description:
      'execute a dml statment to insert, change, view, delete existing data ',
  })
  @ApiBody({
    schema: { type: 'string' },
    examples: {
      insert: {
        value:
          'INSERT INTO employees (name, created_at) VALUES ("omar", "2025-11-23T10:00:00Z")',
      },
      select: {
        value: 'SELECT * FROM employees;',
      },
      update: {
        value: 'UPDATE TABLE employees SET name="ahmed" WHERE id=0;',
      },
      delete: {
        value: 'DELETE FROM employees WHERE name="ahmed";',
      },
    },
  })
  @Post('/execute/dml')
  async executeDML(@Body() body: string) {
    this.winston.info(
      `hit /execute/dml endpoint with Query: ${body}`,
      'executeDML',
    );
    this.winston.info(`recieved query: ${body}`, 'executeDML');
    try {
      return {
        success: true,
        ...(await this.interpreter.interpretDML(body)),
      };
    } catch (err) {
      this.winston.error(err, 'executeDML');
      return { success: false, message: err.message };
    }
  }

  @ApiOperation({
    description: 'executes a DDL statement to create or change db schema',
  })
  @ApiBody({
    schema: { type: 'string' },
    examples: {
      create: {
        value:
          'CREATE TABLE employees (id SERIAL PRIMARY KEY, name VARCHAR(15) DEFAULT "username", created_at TIMESTAMP);',
      },
    },
  })
  @ApiConsumes('text/plain')
  @Post('/execute/ddl')
  async executeDDL(@Body() body: string) {
    this.winston.info(
      `hit /execute/ddl endpoint with Query: ${body}`,
      'executeDDL',
    );
    try {
      return {
        success: true,
        ...(await this.interpreter.interpretDDL(body)),
      };
    } catch (err) {
      this.winston.error(err, 'executeDDL');
      return { success: false, message: err.message };
    }
  }

  @ApiOperation({ description: 'get an array of schema history' })
  @Get('/history')
  async getSchemaHistory() {
    this.winston.info(`hit /history endpoint`, 'executeDDL');
    try {
      return {
        success: true,
        data: await this.storage.getSchemaHistory(),
      };
    } catch (err) {
      this.winston.error(err, 'executeDDL');
      return {
        success: false,
        message: err.message,
      };
    }
  }

  @ApiOperation({
    description: 'set a new schema version from the array got from /history ',
  })
  @ApiBody({ type: setVersionDto })
  @Post('/version')
  async setSchemaVersion(@Body() body: { version: number }) {
    this.winston.info(
      `hit /version endpoint with version: ${body.version}`,
      'setSchemaVersion',
    );
    try {
      return {
        success: true,
        data: await this.storage.setSchemaVersion(body.version),
      };
    } catch (err) {
      this.winston.error(err, 'setSchemaVersion');
      return {
        success: false,
        message: err.message,
      };
    }
  }

  @ApiOperation({
    description: 'get the entire history of changes of a specific row ',
  })
  @ApiBody({ type: selectRowDto })
  @Post('/data/history')
  async getDataHistory(@Body() body: selectRowDto) {
    this.winston.info(
      `hit /data/history endpoint with Query: table=${body.tablename} and id=${body.id}`,
      'getDataHistory',
    );
    try {
      return {
        success: true,
        data: await this.storage.getRowHistory(body.tablename, body.id),
      };
    } catch (err) {
      this.winston.error(err, 'AppController');
      return {
        success: false,
        message: err.message,
      };
    }
  }
}
