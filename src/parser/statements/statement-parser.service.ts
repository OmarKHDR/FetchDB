import { Injectable } from '@nestjs/common';
import { reserved_keywords } from '../../shared/constants/keywords.constants';
import { MathService } from '../math/math.service';
import { WinstonLoggerService } from 'src/winston-logger/winston-logger.service';
import { TokensParser } from '../types/token-parser.type';
import { ExprRes } from '../types/math.types';

@Injectable()
export class StatementParser {
  singleCharacters: Array<string>;
  constructor(
    protected math: MathService,
    protected winston: WinstonLoggerService,
  ) {
    this.singleCharacters = [',', '(', ')', ';'];
  }

  protected peek(state: TokensParser) {
    return state.tokens[state.cursor];
  }

  protected eat(state: TokensParser) {
    return state.tokens[state.cursor++];
  }

  protected handleFromClause(state: TokensParser) {
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
    if (tables.length > 1)
      throw new Error('Not Implemented Error: Cross Joins not implemented yet');
    return tables[0];
  }

  protected handleWhereClause(state: TokensParser): ExprRes | string {
    this.eat(state);
    return this.math.parseExpression(state);
  }
}
