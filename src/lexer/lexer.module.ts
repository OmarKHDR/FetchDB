import { Module } from '@nestjs/common';
import { LexerService } from './lexer.service';

@Module({
  providers: [LexerService],
})
export class LexerModule {}
