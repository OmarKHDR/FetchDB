import { Module } from '@nestjs/common';
import { SqlInterpreterModule } from './sql-interpreter/sql-interpreter.module';
import { LexerModule } from './lexer/lexer.module';
import { ParserModule } from './parser/parser.module';
import { SharedModule } from './shared/shared.module';
import { FitModule } from './fit/fit.module';
import { StorageEngineModule } from './storage-engine/storage-engine.module';
import { DbCreatorModule } from './db-creator/db-creator.module';
import { WinstonLoggerModule } from './winston-logger/winston-logger.module';
import { FileWriterModule } from './file-writer/file-writer.module';
import { FModule } from './f/f.module';
import { FileHandlerModule } from './file-handler/file-handler.module';
import { LexerModule } from './lexer/lexer.module';

@Module({
  imports: [
    SqlInterpreterModule,
    LexerModule,
    ParserModule,
    SharedModule,
    FitModule,
    StorageEngineModule,
    DbCreatorModule,
    WinstonLoggerModule,
    FileHandlerModule,
  ],
})
export class AppModule {}
