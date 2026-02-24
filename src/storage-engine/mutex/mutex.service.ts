import { Injectable } from '@nestjs/common';

// as we are making a lock, the acquire needs to lock a file
// we may map each lock to a certain file name or path
@Injectable()
export class MutexService {
  fileLock: Record<string, Promise<unknown> | undefined>;
  constructor() {
    this.fileLock = {};
  }
  async acquireMutex(tablename: string) {
    let resolver: (value: unknown) => void = () => {};
    const lastTurn = this.fileLock[tablename] || Promise.resolve();
    const myTurn = new Promise((resolve) => {
      resolver = resolve;
    });
    //store the chained new turn
    this.fileLock[tablename] = lastTurn.then(() => myTurn);
    await lastTurn;
    return resolver;
  }
}
