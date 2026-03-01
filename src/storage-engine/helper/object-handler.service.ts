import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectHandlerService {
  filterObject(
    tablename: string,
    rowObj: Record<string, string>,
    columns: Array<string> | '*',
  ) {
    let filteredRowObj = {};
    if (typeof columns === 'string' && columns === '*') {
      delete rowObj['prevVersion'];
      delete rowObj['prevVersionSize'];
      filteredRowObj = rowObj;
    } else {
      for (const column of columns) {
        if (rowObj[column] === undefined)
          throw new Error(
            `relation ${column} doesn't exist on table ${tablename}`,
          );
        filteredRowObj[column] = rowObj[column];
      }
    }
    return filteredRowObj;
  }
}
