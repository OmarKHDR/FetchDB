import { Injectable } from '@nestjs/common';
import { reserved_keywords } from '../../shared/constants/keywords.constants';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';
import { StringManipulationService } from '../../shared/string-manipulation.service';
import { TokensParser } from '../types/token-parser.type';
import { ExprRes } from '../types/math.types';

// type TokenType = 'OP' | 'Pranthesis' | 'Value';
@Injectable()
export class MathService {
  operators: Record<string, number>;
  constructor(
    private winston: WinstonLoggerService,
    private stringManip: StringManipulationService,
  ) {
    this.operators = {
      or: 0,
      and: 1,
      not: 2,
      '=': 3,
      '<': 3,
      '>': 3,
      '<=': 3,
      '>=': 3,
      '<>': 3,
      '+': 4,
      '-': 4,
      '*': 5,
      '/': 5,
      '%': 5,
    };
  }

  peek(state: TokensParser) {
    return state.tokens[state.cursor];
  }

  eat(state: TokensParser) {
    return state.tokens[state.cursor++];
  }

  parseExpression(
    state: TokensParser,
    maxPriority: number = -1,
  ): ExprRes | string {
    let lhs = this.__handleLHS(state);
    while (
      state.cursor < state.tokens.length &&
      this.peek(state) !== ';' &&
      !reserved_keywords.includes(this.peek(state))
    ) {
      const op = this.peek(state);
      if (!(op in this.operators))
        throw new Error(`Syntax Error: operator ${op} is not known`);
      if (this.operators[op] <= maxPriority) break;
      this.eat(state);
      lhs = {
        lhs: lhs,
        operator: op,
        rhs: this.parseExpression(state, this.operators[op]),
      };
    }
    return lhs;
  }

  __handleLHS(state: TokensParser) {
    const lhs = this.peek(state);
    if (lhs === '(') return this.__handlePranthesis(state);
    // then the lhs either a number, a string, a column, NOT
    // string and columns are stored as is,
    if (lhs === 'not') {
      this.eat(state);
      return {
        lhs: '',
        operator: 'not',
        rhs: this.parseExpression(state),
      };
    }
    this.eat(state);

    return lhs;
  }

  __handlePranthesis(state: TokensParser): ExprRes | string {
    this.eat(state); //remove the pranthesis
    let pranthCount = 1;
    const tokens: Array<string> = [];
    while (
      state.cursor < state.tokens.length &&
      this.peek(state) !== ';' &&
      !reserved_keywords.includes(this.peek(state))
    ) {
      const token = this.eat(state);
      if (token === '(') {
        pranthCount++;
      } else if (token === ')') {
        pranthCount--;
      }
      if (pranthCount === 0)
        return this.parseExpression({
          tokens,
          cursor: 0,
        });
      tokens.push(token);
    }
    throw new Error(`Syntax Error: Opened Pranthesis wasn't closed`);
  }

  convertToType(str: string) {
    if (this.stringManip.isString(str)) {
      return {
        value: this.stringManip.removeQoutesIfExists(str),
        type: 'string',
      };
    } else if (!isNaN(Number(str))) {
      return { value: Number(str), type: 'number' };
    } else {
      return { value: str, type: 'column' };
    }
  }

  compare(where: ExprRes | string, rowObj: Record<string, string>) {
    if (typeof where === 'string') {
      const typed = this.convertToType(where);
      if (typed.type === 'column') {
        if (!(typed.value in rowObj)) {
          throw new Error(`Reference Error: can't find relation ${typed.value}`);
        }
        if (
          typeof rowObj[typed.value] === 'string' &&
          this.stringManip.isString(rowObj[typed.value])
        ) {
          return this.stringManip.removeQoutesIfExists(rowObj[typed.value]);
        }
        return Number(rowObj[typed.value]) || rowObj[typed.value];
      }
      return typed.value;
    }
    const left = this.compare(where.lhs, rowObj);
    const right = this.compare(where.rhs, rowObj);
    switch (where.operator) {
      case '=':
        return left === right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case 'and':
        return (left && right) as boolean;
      case 'or':
        return (left || right) as boolean;
      case 'not':
        return !right;
      case '+':
        return (left + right) as number;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      default:
        throw new Error(`Syntax Error: ${where.operator} operator wasnt implemented yet`);
    }
  }
}
