import { Injectable } from '@nestjs/common';

@Injectable()
export class StringManipulationService {
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
}
