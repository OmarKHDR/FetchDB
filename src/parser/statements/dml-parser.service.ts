import { Injectable } from '@nestjs/common';
import { StatementParser } from './statement-parser.service';
import { MathService } from '../math/math.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { ASTDelete, ASTInsert, ASTSelect, ASTUpdate } from '../types/trees';
import { tokensParser } from '../types/token-parser.type';
import { reserved_keywords } from 'src/shared/constants/keywords.constants';

@Injectable()
export class DMLParser extends StatementParser {
  constructor(
    protected math: MathService,
    protected winston: WinstonLoggerService,
  ) {
    super(math, winston);
  }

  handleSelectStatement(state: tokensParser): ASTSelect {
    const result: ASTSelect = {
      statement: 'select',
      tablename: '',
    };
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
      result['tablename'] = this.handleFromClause(state);
    } else {
      throw new Error('Syntax Error: select statemnet must have FROM');
    }
    if (this.peek(state) === 'where')
      result['where'] = this.handleWhereClause(state);
    //if (this.peek(state) === 'group')
    //result['group'] = this.__handleGroubBy(state);
    return result;
  }

  //delete
  handleDeleteStatement(state: tokensParser) {
    const result: ASTDelete = {
      statement: this.eat(state),
      tablename: '',
      where: '',
    };
    result['tablename'] = this.handleFromClause(state);
    result['where'] = this.handleWhereClause(state);
    if (!result['where'])
      throw new Error('ERROR: Delete statement must have a where filter');
    else if (
      (typeof result['where'] === 'object' &&
        result['where'].lhs === result['where'].rhs &&
        result['operator'] === '=') ||
      (typeof result === 'string' && Boolean(Number(result)))
    )
      throw new Error(
        'ERROR: DELETE FROM TABLENAME WHERE true; is not allowed',
      );
    return result;
  }

  //update tablename set column=value, column=value where something
  handleUpdateStatement(state: tokensParser) {
    const result: ASTUpdate = {
      statement: this.eat(state),
      tablename: '',
      column: [],
      value: [],
    };
    if (reserved_keywords.includes(this.peek(state)))
      throw new Error(
        'Syntax Error: a table must be specified for the update sentence',
      );
    result['tablename'] = this.eat(state);
    if (this.eat(state) !== 'set')
      throw new Error('Syntax Error: Expected SET keyword');
    while (
      this.peek(state) !== 'where' &&
      state.cursor < state.tokens.length &&
      this.peek(state) !== ';'
    ) {
      const token = this.eat(state);
      if (reserved_keywords.includes(token))
        throw new Error(
          `Syntax Error: expected column name instead found ${token}`,
        );
      result.column.push(token);
      if (this.peek(state) !== '=') {
        throw new Error(
          `Syntax Error: a value must be specified for column ${result.column.at(-1)}`,
        );
      }
      this.eat(state); // remove the = op
      //find the value to be assigned
      if (!reserved_keywords.includes(this.peek(state))) {
        result.value.push(this.eat(state));
      } else {
        throw new Error(
          `Syntax Error: Expected a value for the column ${result.column.at(-1)}`,
        );
      }
      if (this.peek(state) === ',') this.eat(state);
    }
    result['where'] = this.handleWhereClause(state);
    return result;
  }

  handleInsertStatement(state: tokensParser) {
    const result: ASTInsert = {
      statement: 'insert',
      tablename: '',
      columnsNames: [],
      columnsValues: [],
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
      result['tablename'] = this.eat(state);
    }
    const columnsNames: Array<string> = [];
    if (this.peek(state) === '(') {
      this.eat(state);
      for (; state.cursor < state.tokens.length; ) {
        const token = this.eat(state);
        if (token === ')') break;
        else if (token === ',') continue;
        else {
          if (!token)
            throw new Error(
              `Syntax Error: a column name is missing at ${state.cursor}`,
            );
          columnsNames.push(token);
        }
      }
    }
    const columnsValues: Array<string> = [];
    if (this.peek(state) === 'values') {
      this.eat(state);
      if (this.eat(state) !== '(')
        throw new Error('Syntax Error: error near INTO');
      for (; state.cursor < state.tokens.length; ) {
        const token = this.eat(state);
        if (token === ')') break;
        else if (token === ',') continue;
        else columnsValues.push(token ?? 'null');
      }
    }
    if (
      columnsNames.length !== 0 &&
      columnsNames.length !== columnsValues.length
    )
      throw new Error('Syntax Error: columns and values must match in size');
    result.columnsNames = columnsNames;
    result.columnsValues = columnsValues;
    return result;
  }
}
