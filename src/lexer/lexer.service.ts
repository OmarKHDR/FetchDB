import { Injectable } from '@nestjs/common';

@Injectable()
export class LexerService {
  singleCharacterTokens: Array<string>;
  constructor() {
    this.singleCharacterTokens = [',', '(', ')', '<', '>', '=', ';'];
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
    let isSingleQouted = false;
    for (const token of statement) {
      //if token is white space, check if there is a token on buffer and flush it
      if (!token.trim() && !isSingleQouted) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        continue;
      }

      //if single character token we add the flush buffer if exists, then add that token
      if (this.isSingleCharacterToken(token)) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        tokensArray.push(token);
        continue;
      }

      if (token === "'") {
        isSingleQouted = !isSingleQouted;
      }

      buffer += token;
    }
    if (buffer) tokensArray.push(buffer);
    console.log(tokensArray);
    return tokensArray;
  }
}
