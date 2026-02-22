import { Injectable } from '@nestjs/common';
import { reserved_keywords } from '../shared/constants/keywords.constants';
import { MathService } from './math/math.service';
import type { ExprRes } from './math/math.service';
import { Column, Type } from '../storage-engine/types/column.type';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';

interface tokensParser {
  tokens: string[];
  cursor: number;
}

@Injectable()
export class ParserService {
  singleCharacters: Array<string>;
  constructor(
    private math: MathService,
    private winston: WinstonLoggerService,
  ) {
    this.singleCharacters = [',', '(', ')', ';'];
  }

  peek(state: tokensParser) {
    return state.tokens[state.cursor];
  }

  eat(state: tokensParser) {
    return state.tokens[state.cursor++];
  }

  identify(tokens: string[]) {
    const state = { tokens, cursor: 0 };
    state.tokens = tokens;
    state.cursor = 0;
    if (tokens.at(-1) !== ';') {
      throw new Error(`Syntax Error: queries must end with ';'`);
    }
    this.winston.logger.info(`${tokens.join(' ')}`);
    const statementType = this.peek(state);
    switch (statementType) {
      case 'select':
        return this.__handleSelectStatement(state);
      case 'insert':
        return this.__handleInsertStatement(state);
      // case 'delete':
      //   return this.__handleDeleteStatement(state);
      case 'create':
        return this.__handleCreateStatement(state);
      default:
        throw new Error(
          `this statment wasn't implemeneted yet ${statementType}`,
        );
    }
  }

  __handleSelectStatement(state: tokensParser) {
    const result = {};
    const columnNames: string[] = [];
    result['statement'] = this.eat(state);
    // search selected columns
    // [select] [col1] [,] [col2] [;]
    for (; state.cursor < state.tokens.length; ) {
      if (reserved_keywords.includes(this.peek(state))) {
        break;
      } else {
        const columnName = this.eat(state);
        if (!this.singleCharacters.includes(columnName))
          columnNames.push(columnName);
      }
    }
    if (columnNames.length === 0) {
      throw new Error(`Syntax Error: SELECT must have columns selected`);
    } else {
      result['columns'] = columnNames;
    }

    if (this.peek(state) === 'from') {
      result['from'] = this.__handleFromClause(state);
    } else {
      throw new Error('Syntax Error: select statemnet must have FROM');
    }
    if (this.peek(state) === 'where')
      result['where'] = this.__handleWhereClause(state);
    //if (this.peek(state) === 'group')
    //result['group'] = this.__handleGroubBy(state);
    return result;
  }

  __handleFromClause(state: tokensParser) {
    this.eat(state);
    const tables: Array<string> = [];
    for (; state.cursor < state.tokens.length; ) {
      const token = this.peek(state);
      if (reserved_keywords.includes(token)) break;
      this.eat(state);
      if (token === ';') break;
      if (token === ',') continue;
      else tables.push(token);
    }
    if (tables.length === 0) throw new Error('Syntax Error: Missing FROM');
    return tables;
  }

  __handleWhereClause(state: tokensParser): ExprRes | string {
    this.eat(state);
    return this.math.parseExpression(state);
  }

  __handleInsertStatement(state: tokensParser) {
    const result: {
      table: string;
      columns: Array<{
        name: string;
        value: string;
      }>;
    } = {
      table: '',
      columns: [],
    };
    result['statement'] = this.eat(state);
    if (this.peek(state) !== 'into') {
      throw new Error('Syntax Error: INSERT must haved INTO keyword');
    } else {
      this.eat(state);
    }
    if (reserved_keywords.includes(this.peek(state))) {
      throw new Error('Syntax Error: must provide a table to insert into');
    } else {
      result['table'] = this.eat(state);
    }
    const columnNames: Array<string> = [];
    if (this.peek(state) === '(') {
      this.eat(state);
      for (; state.cursor < state.tokens.length; ) {
        const token = this.eat(state);
        if (token === ')') break;
        else if (token === ',') continue;
        else columnNames.push(token);
      }
    }
    const columnValues: Array<string> = [];
    if (this.peek(state) === 'values') {
      this.eat(state);
      if (this.eat(state) !== '(')
        throw new Error('Syntax Error: error near INTO');
      for (; state.cursor < state.tokens.length; ) {
        const token = this.eat(state);
        if (token === ')') break;
        else if (token === ',') continue;
        else columnValues.push(token);
      }
    }
    if (columnNames.length !== 0) {
      if (columnNames.length !== columnValues.length)
        throw new Error('Syntax Error: columns and values must match in size');
      result['columns'] = [];
      for (let i = 0; i < columnNames.length; i++) {
        if (!columnNames[i])
          throw new Error(`Syntax Error: a column name is missing at ${i}`);
        const obj = {
          name: columnNames[i],
          value: columnValues[i] ?? 'null',
        };
        result.columns.push(obj);
      }
    } else {
      for (let i = 0; i < columnValues.length; i++) {
        const obj = {
          name: '',
          value: columnValues[i] ?? 'null',
        };
        result.columns.push(obj);
      }
    }
    return result;
  }

  // create table users (id serial primary key, ....)
  __handleCreateStatement(state: tokensParser) {
    const result: {
      statement: string;
      tablename: string;
      columns: Column[];
    } = {
      statement: 'create',
      tablename: '',
      columns: [],
    };
    this.eat(state);
    if (this.eat(state) !== 'table') throw new Error('not implemented');
    result['tablename'] = this.eat(state);
    result['columns'] = this.__handleColumnDefinition(state);
    return result;
  }

  __handleColumnDefinition(state: tokensParser): Column[] {
    const columns: Column[] = [];
    if (this.eat(state) !== '(')
      throw new Error(`Syntax Error: table definition must exist`);
    while (state.cursor < state.tokens.length) {
      // each loop is for handling a certain column
      const token = this.peek(state);
      if (token === ')') {
        this.eat(state);
        break;
      }
      if (token === ',') {
        this.eat(state);
        continue;
      }
      const column: Column = {
        name: this.eat(state),
        type: this.eat(state) as Type,
      };
      if (column.type === 'VARCHAR') {
        if (this.eat(state) === '(') {
          const limit = this.eat(state);
          if (isNaN(Number(limit)))
            throw new Error(
              `Syntax Error: Expected number as a limit for varchar and found ${limit}`,
            );
          column.varcharLimint = Number(limit);
          if (this.eat(state) !== ')')
            throw new Error(
              `Syntax Error: Expected closed pranthesis but found ${this.eat(state)}`,
            );
        }
      }
      column.IsNullable = true;
      column.IsUnique = false;
      // search for other column status
      while (
        state.cursor < state.tokens.length &&
        this.peek(state) !== ',' &&
        this.peek(state) !== ')'
      ) {
        const val = this.eat(state);
        if (val === 'primary') {
          const pk = this.eat(state);
          if (pk === 'key') column.IsPK = true;
          else throw new Error(`Syntax Error: expected KEY found ${pk}`);
        }
        if (val === 'not') {
          const nullable = this.eat(state);
          if (nullable === 'null') column.IsNullable = false;
          else throw new Error(`Syntax Error: expected NULL found ${nullable}`);
        }
        if (val === 'default') {
          const defaultVal = this.eat(state);
          if (['FLOAT', 'SERIAL', 'INT'].includes(column.type)) {
            if (isNaN(Number(defaultVal))) {
              throw new Error(
                `Syntax Error: Expected numeric default for ${column.type}`,
              );
            }
          }
          if (defaultVal !== ',' && defaultVal !== ')') {
            column.default = defaultVal;
          } else
            throw new Error(
              `Syntax Error: expected value of type ${column.type} found ${defaultVal}`,
            );
        }
      }
      columns.push(column);
    }
    return columns;
  }
}
