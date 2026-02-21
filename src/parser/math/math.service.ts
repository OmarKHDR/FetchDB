/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';

type Expression = {
  tokens: Array<string>;
  cursor: number;
};
type ExprRes = {
  lhs: ExprRes | string;
  operator: string;
  rhs: ExprRes | string;
};
// type TokenType = 'OP' | 'Pranthesis' | 'Value';
@Injectable()
export class MathService {
  operators: Record<string, number>;
  constructor() {
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
    while (state.cursor < state.tokens.length) {
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
}
