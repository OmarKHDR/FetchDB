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
    // we need to chain the mutex into a promise each time its called
    // so we are queueing the events so an await will need all the promises to resolve, as node is single
    // threaded no need to worry about wrapping promises to have any concurrent issue
    // filelock -> last promise -> .then(the new promise)
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
