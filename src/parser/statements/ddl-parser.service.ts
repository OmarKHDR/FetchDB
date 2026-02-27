import { Injectable } from '@nestjs/common';
import { StatementParser } from './statement-parser.service';
import { MathService } from '../math/math.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { Column, Type } from 'src/storage-engine/types/column.type';
import { tokensParser } from '../types/token-parser.type';
import { ASTCreate } from '../types/trees';
import { cp } from 'fs';

@Injectable()
export class DDLParser extends StatementParser {
  constructor(
    protected math: MathService,
    protected winston: WinstonLoggerService,
  ) {
    super(math, winston);
  }
  handleCreateStatement(state: tokensParser) {
    const result: ASTCreate = {
      statement: 'create',
      tablename: '',
      columns: [],
    };
    this.eat(state);
    if (this.eat(state) !== 'table') throw new Error('not implemented');
    result['tablename'] = this.eat(state);
    result['columns'] = this.handleColumnDefinition(state);
    return result;
  }

  handleColumnDefinition(state: tokensParser): Column[] {
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
      if (column.type === 'varchar') {
        if (this.eat(state) === '(') {
          const limit = this.eat(state);
          if (isNaN(Number(limit)))
            throw new Error(
              `Syntax Error: Expected number as a limit for varchar and found ${limit}`,
            );
          column.varcharLimit = Number(limit);
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
          if (pk === 'key') {
            column.IsNullable = false;
            column.IsUnique = true;
            column.IsPK = true;
          } else throw new Error(`Syntax Error: expected KEY found ${pk}`);
        }
        if (val === 'not') {
          const nullable = this.eat(state);
          if (nullable === 'null') column.IsNullable = false;
          else throw new Error(`Syntax Error: expected NULL found ${nullable}`);
        }
        if (val === 'default') {
          const defaultVal = this.eat(state);
          if (['float', 'serial', 'int'].includes(column.type)) {
            if (isNaN(Number(defaultVal))) {
              throw new Error(
                `Syntax Error: Expected numeric default for ${column.type}`,
              );
            }
            if (column.type === 'serial') {
              column.serial = 0;
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
