import { Injectable } from '@nestjs/common';
import { StatementParser } from './statement-parser.service';
import { MathService } from '../math/math.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { Column, Type, Types } from 'src/storage-engine/types/column.type';
import { TokensParser } from '../types/token-parser.type';
import { ASTCreate } from '../types/trees';
import { reserved_keywords } from 'src/shared/constants/keywords.constants';
import { NameValidationService } from 'src/shared/name-validation.service';
import { ValidatorService } from 'src/shared/validator.service';

@Injectable()
export class DDLParser extends StatementParser {
  constructor(
    protected math: MathService,
    protected winston: WinstonLoggerService,
    protected nameValidator: NameValidationService,
    protected validator: ValidatorService,
  ) {
    super(math, winston, nameValidator);
  }
  handleCreateStatement(state: TokensParser) {
    const result: ASTCreate = {
      statement: 'create',
      tablename: '',
      columns: [],
    };
    this.winston.info(`handling the create statement`, 'DDLParser');
    this.eat(state);
    if (this.eat(state) !== 'table') throw new Error('not implemented');
    result['tablename'] = this.eat(state);
    this.nameValidator.validateName(result['tablename'], 'Table Name');
    result['columns'] = this.handleColumnDefinition(state);
    this.winston.info(`parsed create statement: ${result}`, 'DDLParser');
    return result;
  }

  handleColumnDefinition(state: TokensParser): Column[] {
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
      if (reserved_keywords.includes(token)) {
        throw new Error(
          `Syntax Error: unexpected keyword ${token.toUpperCase()}`,
        );
      }
      // (name type primary key not null)
      const column: Column = {
        name: this.eat(state),
        type: this.eat(state) as Type,
      };
      this.nameValidator.validateName(column.name, 'Column Name');
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
      } else {
        if (!Types.includes(column.type))
          throw new Error(`Syntax Error: type ${column.type} is not known`);
      }
      column.IsNullable = true;
      column.IsUnique = false;
      // search for other column status
      while (
        state.cursor < state.tokens.length &&
        this.peek(state) !== ',' &&
        this.peek(state) !== ')'
      ) {
        const token = this.eat(state);
        if (token === 'primary') {
          const pk = this.eat(state);
          if (pk === 'key') {
            column.IsNullable = false;
            column.IsUnique = true;
            column.IsPK = true;
          } else throw new Error(`Syntax Error: expected KEY found ${pk}`);
        }
        if (token === 'not') {
          const nullable = this.eat(state);
          if (nullable === 'null') column.IsNullable = false;
          else throw new Error(`Syntax Error: expected NULL found ${nullable}`);
        }
        if (column.type === 'serial') column.serial = 0;
        if (token === 'unique') column.IsUnique = true;
        if (token === 'default') {
          const defaultVal = this.eat(state);
          if (column.type === 'serial')
            throw new Error('Can not assign default value to type serial');
          this.validator.validateType(column.type, defaultVal);
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
