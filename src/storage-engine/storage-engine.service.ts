import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './file-handler/file-handler.service';
import { ASTCreate } from 'src/parser/types/trees';
@Injectable()
export class StorageEngineService {
  constructor(private filehander: FileHandlerService) {}

  async createTable(ASTtree: ASTCreate) {
    await this.filehander.createNewTable(ASTtree.tablename, ASTtree.columns);
  }
}
