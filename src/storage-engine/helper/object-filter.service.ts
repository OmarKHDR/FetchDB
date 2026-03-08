import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectFilterService {
  filterObject(
    tablename: string,
    rowObj: Record<string, string>,
    columns: Array<string> | '*',
  ) {
    let filteredRowObj = {};
    if (typeof columns !== 'string') {
      for (const column of columns) {
        if (rowObj[column] === undefined)
          throw new Error(
            `relation ${column} doesn't exist on table ${tablename}`,
          );
        filteredRowObj[column] = rowObj[column];
      }
    } else {
      filteredRowObj = { ...rowObj };
      delete filteredRowObj['prevVersion'];
      delete filteredRowObj['prevVersionSize'];
    }
    return filteredRowObj;
  }
}
