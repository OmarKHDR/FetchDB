import { Injectable } from '@nestjs/common';
import { LexerService } from './lexer/lexer.service';
import { ParserService } from '../parser/parser.service';
import { StorageEngineService } from 'src/storage-engine/storage-engine.service';
import {
  ASTCreate,
  ASTDelete,
  ASTInsert,
  ASTSelect,
  ASTUpdate,
} from 'src/parser/types/trees';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
@Injectable()
export class SqlInterpreterService {
  constructor(
    private lexer: LexerService,
    private parser: ParserService,
    private storageEngine: StorageEngineService,
    private winston: WinstonLoggerService,
  ) {}

  async interpretDML(sqlquery: string) {
    const tokens = this.lexer.tokinize(sqlquery);
    const ASTobj = this.parser.identify(tokens);
    this.winston.query(
      tokens.join(' '),
      'DML',
      await this.storageEngine.getSchemaVersion(),
      'DML Interpreter',
    );
    switch (ASTobj.statement) {
      case 'insert':
        return {
          query: tokens.join(' '),
          result: await this.storageEngine.insertIntoTable(ASTobj as ASTInsert),
        };
      case 'select':
        return {
          query: tokens.join(' '),
          result: await this.storageEngine.selectRows(ASTobj as ASTSelect),
        };
      case 'update':
        return {
          query: tokens.join(' '),
          result: await this.storageEngine.updateTable(ASTobj as ASTUpdate),
        };
      case 'delete':
        return {
          query: tokens.join(' '),
          result: await this.storageEngine.deleteRows(ASTobj as ASTDelete),
        };
      case 'create':
        throw new Error(
          'Interpreter Error: This is a DDL statement call the /execute/ddl endpoint',
        );
      default:
        throw new Error(
          `Not Implemented Error: This statement not implemented yet ${ASTobj.statement}`,
        );
    }
  }

  async interpretDDL(sqlquery: string) {
    const tokens = this.lexer.tokinize(sqlquery);
    const ASTobj = this.parser.identify(tokens);
    this.winston.query(
      tokens.join(' '),
      'DDL',
      await this.storageEngine.getSchemaVersion(),
      'DDL Interpreter',
    );
    switch (ASTobj.statement) {
      case 'create':
        await this.storageEngine.createTable(ASTobj as ASTCreate);
        return {
          ddl: tokens.join(' '),
          message: 'DDL generated and saved to schema files.',
        };
      case 'insert':
      case 'select':
      case 'delete':
      case 'update':
        throw new Error('Interpreter Error: This is a DML statement call the /execute/dml endpoint')
      default:
        throw new Error(
          `Not Implemented Error: This statement not implemented yet ${ASTobj.statement}`,
        );
    }
  }
}
