import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from '../../winston-logger/winston-logger.service';

@Injectable()
export class LexerService {
  singleCharacterTokens: Array<string>;
  BinOp: Array<string>;
  constructor(private winston: WinstonLoggerService) {
    this.singleCharacterTokens = [',', '(', ')', ';', '*'];
    this.BinOp = ['<', '>', '!', '='];
  }

  isSingleCharacterToken(c: string): boolean {
    for (const char of this.singleCharacterTokens) {
      if (char === c) return true;
    }
    return false;
  }

  tokinize(statement: string): Array<string> {
    const tokensArray: Array<string> = [];
    let buffer: string = '';
    let isQouted = false;
    for (let i = 0; i < statement.length; i++) {
      let char = statement[i];
      if (char === "'" || char === '"') {
        isQouted = !isQouted;
      }
      // name=af"st of  -- 32 "
      //if char is white space, check if there is a char on buffer and flush it
      if (isQouted) {
        buffer += char;
        continue;
      }
      char = char.toLowerCase();
      // " " => "" select colu
      if (!char.trim()) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        continue;
      }
      //if single character token we add then flush buffer if exists, then add that token
      if (this.isSingleCharacterToken(char)) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        tokensArray.push(char);
        continue;
      }

      // >= <= ===
      if (this.BinOp.includes(char)) {
        if (this.BinOp.includes(statement[i + 1])) {
          if (buffer) tokensArray.push(buffer);
          buffer = char + statement[i + 1];
          tokensArray.push(buffer);
          i++;
          buffer = '';
          continue;
        } else {
          if (buffer) tokensArray.push(buffer);
          tokensArray.push(char);
          buffer = '';
          continue;
        }
      }

      buffer += char;
    }
    if (buffer) tokensArray.push(buffer);
    this.winston.info(
      `The tokenizer finished tokenizing: [${tokensArray.join(', ')}]`,
      'Tokenizer',
    );
    return tokensArray;
  }
}
