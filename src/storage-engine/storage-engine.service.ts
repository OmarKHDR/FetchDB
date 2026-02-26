import { Injectable } from '@nestjs/common';
import { FileHandlerService } from './file-handler/file-handler.service';
import { ASTCreate, ASTInsert, ASTSelect } from 'src/parser/types/trees';

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
      ASTtree.where,
      options,
    );
  }
}
