import { Module } from '@nestjs/common';
import { DbCreatorService } from './db-creator.service';
import { WinstonLoggerModule } from 'src/winston-logger/winston-logger.module';

@Module({
  imports: [WinstonLoggerModule],
  providers: [DbCreatorService],
})
export class DbCreatorModule {}
