import { Injectable } from '@nestjs/common';
import fs from 'fs/promises';
@Injectable()
export class StorageStrategyService {
  appendToFile(file: { table: fs.FileHandle; index: fs.FileHandle }) {}
}
