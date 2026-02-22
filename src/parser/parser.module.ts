import { Module } from '@nestjs/common';
import { ParserService } from './parser.service';
import { MathService } from './math/math.service';
import { SharedModule } from 'src/shared/shared.module';
import { WinstonLoggerModule } from 'src/winston-logger/winston-logger.module';

@Module({
  imports: [SharedModule, WinstonLoggerModule],
  providers: [ParserService, MathService],
  exports: [ParserService],
})
export class ParserModule {}
