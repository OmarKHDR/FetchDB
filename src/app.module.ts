import { Module } from '@nestjs/common';
import { SqlInterpreterModule } from './sql-interpreter/sql-interpreter.module';
import { ParserModule } from './parser/parser.module';
import { SharedModule } from './shared/shared.module';
import { StorageEngineModule } from './storage-engine/storage-engine.module';
import { WinstonLoggerModule } from './winston-logger/winston-logger.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    SqlInterpreterModule,
    ParserModule,
    SharedModule,
    StorageEngineModule,
    WinstonLoggerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
