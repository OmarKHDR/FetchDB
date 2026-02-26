import { Module } from '@nestjs/common';
import { SqlInterpreterService } from './sql-interpreter.service';
import { LexerService } from './lexer/lexer.service';
import { ParserModule } from 'src/parser/parser.module';
import { WinstonLoggerModule } from 'src/winston-logger/winston-logger.module';
import { StorageEngineModule } from 'src/storage-engine/storage-engine.module';

@Module({
  imports: [ParserModule, WinstonLoggerModule, StorageEngineModule],
  providers: [SqlInterpreterService, LexerService],
  exports: [SqlInterpreterService],
})
export class SqlInterpreterModule {}
