import { Injectable } from '@nestjs/common';
import winston from 'winston';

@Injectable()
export class WinstonLoggerService {
  logger: winston.Logger;
  constructor() {
    this.logger = winston.createLogger({
      levels: {
        queries: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
      },
      level: process.env.ENV === 'DEV' ? 'debug' : 'info',
      transports: [
        new winston.transports.Console({ level: 'debug' }),
        new winston.transports.File({
          level: 'queries',
          filename: `${process.cwd()}/logs/query.logs`,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD/MM/YYYY@hh:mm:ss' }),
            winston.format.printf(
              ({ timestamp, level, message }) =>
                `${timestamp} - [${level}] ${message}`,
            ),
          ),
        }),
      ],
    });
  }
}
