import { Module } from '@nestjs/common';
import { SqlInterpreterModule } from './sql-interpreter/sql-interpreter.module';
import { LexerModule } from './lexer/lexer.module';
import { ParserModule } from './parser/parser.module';
import { SharedModule } from './shared/shared.module';
import { FitModule } from './fit/fit.module';
import { StorageEngineModule } from './storage-engine/storage-engine.module';
import { WinstonLoggerModule } from './winston-logger/winston-logger.module';

@Module({
  imports: [
    SqlInterpreterModule,
    LexerModule,
    ParserModule,
    SharedModule,
    FitModule,
    StorageEngineModule,
    WinstonLoggerModule,
  ],
})
export class AppModule {}
