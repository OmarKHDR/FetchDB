import { Injectable } from '@nestjs/common';

@Injectable()
export class LexerService {
  singleCharacterTokens: Array<string>;
  constructor() {
    this.singleCharacterTokens = [',', '(', ')'];
  }

  isSingleQuoteCharacter(c: string): boolean {
    for (const char of this.singleCharacterTokens) {
      if (char === c) return true;
    }
    return false;
  }

  tokinize(statement: string): Array<string> {
    const tokensArray: Array<string> = [];
    let tokenEnd: boolean = false;
    let buffer: string = '';
    for (const token of statement) {
      if (!token.trim()) {
        tokenEnd = true;
      } else if (this.isSingleQuoteCharacter(token)) {
        if (buffer) tokensArray.push(buffer);
        tokensArray.push(token);
        buffer = '';
        tokenEnd = true;
      } else {
        buffer = buffer + token;
        tokenEnd = false;
      }
      if (tokenEnd && buffer) {
        tokensArray.push(buffer);
        buffer = '';
      }
    }
    if (buffer) tokensArray.push(buffer);
    console.log(tokensArray);
    return tokensArray;
  }
}
