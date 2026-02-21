import { Injectable } from '@nestjs/common';

@Injectable()
export class LexerService {
  singleCharacterTokens: Array<string>;
  BinOp: Array<string>;
  constructor() {
    this.singleCharacterTokens = [',', '(', ')', ';'];
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
    let isSingleQouted = false;
    for (let i = 0; i < statement.length; i++) {
      let token = statement[i];
      if (token === "'") {
        isSingleQouted = !isSingleQouted;
      }
      //if token is white space, check if there is a token on buffer and flush it
      if (isSingleQouted) {
        buffer += token;
        continue;
      }
      token = token.toLowerCase();
      if (!token.trim()) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        continue;
      }
      //if single character token we add then flush buffer if exists, then add that token
      if (this.isSingleCharacterToken(token)) {
        if (buffer) tokensArray.push(buffer);
        buffer = '';
        tokensArray.push(token);
        continue;
      }

      if (this.BinOp.includes(token)) {
        if (this.BinOp.includes(statement[i + 1])) {
          if (buffer) tokensArray.push(buffer);
          buffer = token + statement[i + 1];
          tokensArray.push(buffer);
          i++;
          buffer = '';
          continue;
        } else {
          if (buffer) tokensArray.push(buffer);
          tokensArray.push(token);
          buffer = '';
          continue;
        }
      }

      buffer += token;
    }
    if (buffer) tokensArray.push(buffer);
    // console.log(tokensArray);
    return tokensArray;
  }
}
