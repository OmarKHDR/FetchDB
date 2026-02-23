import { Injectable } from '@nestjs/common';
import { LexerService } from './lexer/lexer.service';
import { ParserService } from '../parser/parser.service';
import { StorageEngineService } from 'src/storage-engine/storage-engine.service';
import { ASTCreate } from 'src/parser/types/trees';
@Injectable()
export class SqlInterpreterService {
  constructor(
    private lexer: LexerService,
    private parser: ParserService,
    private storageEngine: StorageEngineService,
  ) {}

  async interpret(sqlquery: string) {
    const tokens = this.lexer.tokinize(sqlquery);
    const ASTobj = this.parser.identify(tokens);
    switch (ASTobj.statement) {
      case 'create':
        await this.storageEngine.createTable(ASTobj as ASTCreate);
        break;
      default:
        throw new Error(`not implemented statement`);
    }
    return ASTobj;
  }
}
