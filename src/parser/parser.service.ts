import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { DDLParser } from './statements/ddl-parser.service';
import { DMLParser } from './statements/dml-parser.service';

@Injectable()
export class ParserService {
  constructor(
    private ddlParser: DDLParser,
    private dmlParser: DMLParser,
    private winston: WinstonLoggerService,
  ) {}
  identify(tokens: string[]) {
    const state = { tokens, cursor: 0 };
    state.tokens = tokens;
    state.cursor = 0;

    const statementType = tokens[0];
    let result;
    switch (statementType) {
      case 'select':
        result = this.dmlParser.handleSelectStatement(state);
        break;
      case 'insert':
        result = this.dmlParser.handleInsertStatement(state);
        break
      case 'delete':
        result = this.dmlParser.handleDeleteStatement(state);
        break;
      case 'update':
        result = this.dmlParser.handleUpdateStatement(state);
        break;
      case 'create':
        result = this.ddlParser.handleCreateStatement(state);
        break;
      default:
        throw new Error(
          `Not Implemented Error: this statment wasn't implemeneted yet ${statementType}`,
        );
    }
    if (state.tokens[state.cursor] !== ';')
          throw new Error(`Syntax Error: Expected ; and found ${state.tokens[state.cursor]}`);
    return result;  
  }
}
