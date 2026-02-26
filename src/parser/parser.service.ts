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
    if (tokens.at(-1) !== ';') {
      throw new Error(`Syntax Error: queries must end with ';'`);
    }
    const statementType = tokens[0];
    switch (statementType) {
      case 'select':
        return this.dmlParser.handleSelectStatement(state);
      case 'insert':
        return this.dmlParser.handleInsertStatement(state);
      case 'delete':
        return this.dmlParser.handleDeleteStatement(state);
      case 'update':
        return this.dmlParser.handleUpdateStatement(state);
      case 'create':
        return this.ddlParser.handleCreateStatement(state);
      default:
        throw new Error(
          `this statment wasn't implemeneted yet ${statementType}`,
        );
    }
  }
}
