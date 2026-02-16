import { Module } from '@nestjs/common';
import { LexerService } from './lexer.service';

@Module({
  providers: [LexerService],
  exports: [LexerService],
})
export class LexerModule {}
