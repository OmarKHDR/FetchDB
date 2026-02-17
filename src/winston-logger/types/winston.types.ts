import winston from 'winston';

declare module 'winston' {
  interface Logger {
    queries: winston.LeveledLogMethod;
  }
}
export {};
