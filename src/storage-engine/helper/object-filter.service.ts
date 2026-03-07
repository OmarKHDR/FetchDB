import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectFilterService {
  filterObject(
    tablename: string,
    rowObj: Record<string, string>,
    columns: Array<string> | '*',
  ) {
    let filteredRowObj = {...rowObj};
    if (typeof columns === 'string' && columns === '*') {
      delete filteredRowObj['prevVersion'];
      delete filteredRowObj['prevVersionSize'];
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
