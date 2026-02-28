import { Injectable } from '@nestjs/common';
import { reserved_keywords } from '../../shared/constants/keywords.constants';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';

type Expression = {
  tokens: Array<string>;
  cursor: number;
};
export type ExprRes = {
  lhs: ExprRes | string;
  operator: string;
  rhs: ExprRes | string;
};
// type TokenType = 'OP' | 'Pranthesis' | 'Value';
@Injectable()
export class MathService {
  operators: Record<string, number>;
  constructor(private winston: WinstonLoggerService) {
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

  peek(state: Expression) {
    return state.tokens[state.cursor];
  }

  eat(state: Expression) {
    return state.tokens[state.cursor++];
  }

  parseExpression(
    state: Expression,
    maxPriority: number = -1,
  ): ExprRes | string {
    let lhs = this.__handleLHS(state); // handle the (), not or token and return the value;
    let rhs: ExprRes | string;
    // {lhs: {lhs: 5, op: *, rhs: 6}, op: +, rhs:2}
    // in the opposite {lhs: 5, op: +, rhs: {lhs: 6, op: *, rhs: 6 }}
    while (
      state.cursor < state.tokens.length &&
      this.peek(state) != ';' &&
      !reserved_keywords.includes(this.peek(state))
    ) {
      const op = this.peek(state);
      if (!(op in this.operators))
        throw new Error(`Syntax Error: unknow operator ${op}`);
      if (this.operators[op] <= maxPriority) break; //impossible at first itiration
      this.eat(state);
      rhs = this.parseExpression(state, this.operators[op]);
      lhs = {
        lhs: lhs,
        operator: op,
        rhs: rhs,
      } as ExprRes;
    }
    return lhs;
  }

  __handleLHS(state: Expression) {
    const token = this.eat(state);
    if (token === '(') return this.__handlePranthesis(state);
    if (token === 'not')
      return {
        lhs: '',
        operator: 'not',
        rhs: this.parseExpression(state, this.operators['not']),
      };
    else return token;
  }

  __handlePranthesis(state: Expression): ExprRes | string {
    let pranthesisCount = 1;
    const nestedState: Expression = { tokens: [], cursor: 0 };
    for (let i = 1; i < state.tokens.length; i++) {
      const token = this.eat(state);
      if (token === '(') pranthesisCount++;
      else if (token === ')') {
        pranthesisCount--;
      }
      if (pranthesisCount === 0) break;
      else nestedState.tokens.push(token);
    }
    return this.parseExpression(nestedState);
  }

  convertToType(str: string) {
    if (str.startsWith('"') || str.startsWith("'")) {
      return { value: str.slice(1, str.length - 1), type: 'string' };
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
          throw new Error(`can't find relation ${typed.value}`);
        }
        if (
          typeof rowObj[typed.value] === 'string' &&
          (rowObj[typed.value].startsWith('"') ||
            rowObj[typed.value].startsWith("'"))
        ) {
          return rowObj[typed.value].slice(1, rowObj[typed.value].length - 1);
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
        throw new Error('this operator wasnt implemented yet');
    }
  }
}
