import { Injectable } from '@nestjs/common';
import { LexerService } from './lexer/lexer.service';
import { ParserService } from '../parser/parser.service';
import { StorageEngineService } from 'src/storage-engine/storage-engine.service';
import { ASTCreate, ASTInsert, ASTSelect } from 'src/parser/types/trees';
@Injectable()
export class SqlInterpreterService {
  constructor(
    private lexer: LexerService,
    private parser: ParserService,
    private storageEngine: StorageEngineService,
  ) {}

  async interpretDML(sqlquery: string) {
    const tokens = this.lexer.tokinize(sqlquery);
    const ASTobj = this.parser.identify(tokens);
    switch (ASTobj.statement) {
      case 'insert':
        return await this.storageEngine.insertIntoTable(ASTobj as ASTInsert);
      case 'select':
        return await this.storageEngine.selectRows(ASTobj as ASTSelect);
      case 'create':
        throw new Error(
          '[Interpreter Error]: This is a DDL statement call the /execute/ddl endpoint',
        );
      default:
        throw new Error(`not implemented statement`);
    }
  }

  async interpretDDL(sqlquery: string) {
    const tokens = this.lexer.tokinize(sqlquery);
    const ASTobj = this.parser.identify(tokens);
    switch (ASTobj.statement) {
      case 'create':
        return await this.storageEngine.createTable(ASTobj as ASTCreate);
      case 'insert':
        throw new Error(
          '[Interpreter Error]: This is a DML statement call the /execute/dml endpoint',
        );
      case 'select':
        throw new Error(
          '[Interpreter Error]: This is a DML statement call the /execute/dml endpoint',
        );
      default:
        throw new Error(
          `[Interpreter Error]: This statement not implemented yet ${ASTobj.statement}`,
        );
    }
  }
}
