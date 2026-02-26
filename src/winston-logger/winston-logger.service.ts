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
        new winston.transports.Console({
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ context, timestamp, level, message }) =>
                `[${context as string}] - ${timestamp as string} - [${level.toUpperCase()}] ${message as string}`,
            ),
          ),
        }),
        new winston.transports.File({
          level: 'queries',
          filename: `${process.cwd()}/logs/query.logs`,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'DD/MM/YYYY@hh:mm:ss' }),
            winston.format.printf(
              ({ context, timestamp, level, message }) =>
                `[${context as string}] - ${timestamp as string} - [${level.toUpperCase()}] ${message as string}`,
            ),
          ),
        }),
      ],
    });
  }

  warn(message: string, context?: string) {
    this.logger.warn(` ${message}`, { context });
  }

  info(message: string, context?: string) {
    this.logger.info(` ${message}`, { context });
  }

  error(message: string, context?: string) {
    this.logger.error(` ${message}`, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(` ${message}`, { context });
  }
  query(message: string, context?: string) {
    this.logger.queries(` ${message}`, { context });
  }
}
