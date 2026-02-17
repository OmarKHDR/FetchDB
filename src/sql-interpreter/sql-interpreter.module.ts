import { Module } from '@nestjs/common';
import { SqlInterpreterService } from './sql-interpreter.service';
import { LexerService } from '../lexer/lexer.service';

@Module({
  providers: [SqlInterpreterService, LexerService],
})
export class SqlInterpreterModule {}
