import { Injectable } from '@nestjs/common';
import { Column, Type } from 'src/storage-engine/types/column.type';

@Injectable()
export class ValidatorService {
  validateType(t: Type, value: string) {
    try {
      switch (t) {
        case 'float':
          parseFloat(value);
          return;
        case 'int':
          parseInt(value);
          return;
        case 'serial':
          BigInt(value);
          return;
        case 'timestamp':
          value = this.removeQoutesIfExists(value);
          if (new Date(value).getTime() > 0) return;
          else throw new Error('');
        case 'varchar':
          return;
      }
    } catch (err) {
      throw new Error(`Type Violation: ${value} should have been of type ${t}`);
    }
  }

  isString(val: string) {
    return val.startsWith('"') || val.startsWith("'");
  }

  removeQoutesIfExists(val: string) {
    if (this.isString(val)) {
      return val.slice(1, -1);
    } else {
      return val;
    }
  }

  constraintsValidator(column: Column, value: string, valueExists?: boolean) {
    if (column.IsNullable && value === 'null')
      throw new Error(`Constraint Violation: ${column.name} can't be null`);
    this.validateType(column.type, value);
    if (valueExists)
      throw new Error(`Constraint Violation: Unique constraints violation`);
    if (column.type === 'varchar') {
      if (value.length - 2 > (column.varcharLimit || 65535)) {
        throw new Error(
          `Constraint Violation: VARCHAR limit exceeded current limit is: ${column.varcharLimit}, found: ${value.length - 2}`,
        );
      }
    }
    //checking for fk relations
  }

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
