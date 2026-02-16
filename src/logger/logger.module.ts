import { ConsoleLogger, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
	imports: [ConsoleLogger],
  providers: [LoggerService],
	exports: [LoggerService],
})
export class LoggerModule {}
