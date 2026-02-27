import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './file-handler/file-handler.service';
import {
  ASTCreate,
  ASTDelete,
  ASTInsert,
  ASTSelect,
  ASTUpdate,
} from 'src/parser/types/trees';

@Injectable()
export class StorageEngineService {
  constructor(private filehander: FileHandlerService) {}

  async createTable(ASTtree: ASTCreate) {
    return await this.filehander.createNewTable(
      ASTtree.tablename,
      ASTtree.columns,
    );
  }

  async insertIntoTable(ASTtree: ASTInsert) {
    return await this.filehander.writeToTable(
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
        id:
          ASTtree.where.lhs === '0' || ASTtree.where.rhs === '0'
            ? 0
            : Number(ASTtree.where.rhs) || Number(ASTtree.where.lhs),
      };
    }
    return await this.filehander.getMatchedRows(
      ASTtree.tablename,
      ASTtree.columns,
      ASTtree.where,
      options,
    );
  }

  async updateTable(ASTtree: ASTUpdate) {
    return await this.filehander.updateRows(
      ASTtree.tablename,
      ASTtree.where,
      ASTtree.column,
      ASTtree.value,
    );
  }

  async deleteRows(ASTtree: ASTDelete) {
    return await this.filehander.deleteRow(ASTtree.tablename, ASTtree.where);
  }

  async getSchemaHistory() {
    return await this.filehander.getAllSchema();
  }

  async setSchemaVersion(v: number) {
    await this.filehander.setSchemaVersion(v);
  }
}
