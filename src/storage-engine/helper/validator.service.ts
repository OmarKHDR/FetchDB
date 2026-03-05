import { Injectable } from '@nestjs/common';
import { StringManipulationService } from 'src/shared/string-manipulation.service';
import { Column, Type } from 'src/storage-engine/types/column.type';

@Injectable()
export class ValidatorService {
  constructor(private stringManip: StringManipulationService) {}
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
          value = this.stringManip.removeQoutesIfExists(value);
          if (new Date(value).getTime() > 0) return;
          else throw new Error('');
        case 'varchar':
          return;
      }
    } catch (err) {
      throw new Error(`Type Violation: ${value} should have been of type ${t}`);
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
}
