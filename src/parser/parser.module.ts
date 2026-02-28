import { Module } from '@nestjs/common';
import { DDLParser } from './statements/ddl-parser.service';
import { DMLParser } from './statements/dml-parser.service';
import { ParserService } from './parser.service';
import { MathService } from './math/math.service';
import { SharedModule } from 'src/shared/shared.module';
import { WinstonLoggerModule } from 'src/winston-logger/winston-logger.module';

@Module({
  imports: [SharedModule, WinstonLoggerModule],
  providers: [ParserService, MathService, DDLParser, DMLParser],
  exports: [ParserService, MathService],
})
export class ParserModule {}
