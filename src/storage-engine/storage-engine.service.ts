import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './handlers/file-handler/file-handler.service';
import {
  ASTCreate,
  ASTDelete,
  ASTInsert,
  ASTSelect,
  ASTUpdate,
} from 'src/parser/types/trees';
import { WriteHandlerService } from './handlers/write-handler/write-handler.service';
import { ReadHandlerService } from './handlers/read-handler/read-handler.service';
import { UpdateHandlerService } from './handlers/update-handler/update-handler.service';
import { DeleteHandlerService } from './handlers/delete-handler/delete-handler.service';

@Injectable()
export class StorageEngineService {
  constructor(
    private filehander: FileHandlerService,
    private writeService: WriteHandlerService,
    private readService: ReadHandlerService,
    private updateService: UpdateHandlerService,
    private deleteService: DeleteHandlerService,
  ) {}

  async createTable(ASTtree: ASTCreate) {
    return await this.filehander.createNewTable(
      ASTtree.tablename,
      ASTtree.columns,
    );
  }

  async insertIntoTable(ASTtree: ASTInsert) {
    return await this.writeService.writeToTable(
      ASTtree.tablename,
      ASTtree.columnsValues,
      ASTtree.columnsNames,
    );
  }

  async selectRows(ASTtree: ASTSelect) {
    let options: { op: string; id: number } | undefined = undefined;
    if (
      typeof ASTtree.where !== 'string' &&
      (ASTtree.where?.lhs === 'id' || ASTtree.where?.rhs === 'id') &&
      (!isNaN(Number(ASTtree.where.rhs)) ||
        !isNaN(Number(ASTtree.where.lhs))) &&
      ['>', '<', '>=', '<=', '='].includes(ASTtree.where.operator)
    ) {
      options = {
        op: ASTtree.where.operator,
        id: Number(ASTtree.where.rhs) || Number(ASTtree.where.lhs) || 0,
      };
    }
    return await this.readService.getMatchedRows(
      ASTtree.tablename,
      ASTtree.columns,
      ASTtree.where,
      options,
    );
  }

  async updateTable(ASTtree: ASTUpdate) {
    return await this.updateService.updateRows(
      ASTtree.tablename,
      ASTtree.where,
      ASTtree.column,
      ASTtree.value,
    );
  }

  async deleteRows(ASTtree: ASTDelete) {
    return await this.deleteService.deleteRow(ASTtree.tablename, ASTtree.where);
  }

  async getSchemaHistory() {
    return await this.filehander.getAllSchema();
  }

  async setSchemaVersion(v: number) {
    await this.filehander.setSchemaVersion(v);
  }

  async getSchemaVersion() {
    return await this.filehander.getSchemaVersion();
  }
 
  async getRowHistory(tablename: string, id: number) {
    return await this.readService.getRowHistory(tablename, id);
  }
}
