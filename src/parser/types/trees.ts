import { Column } from 'src/storage-engine/types/column.type';
import { ExprRes } from '../math/math.service';

export type ASTSelect = {
  statement: string;
  from: string[];
  selectAll?: boolean;
  columns?: Array<string>;
  where?: ExprRes | string;
};

export type ASTCreate = {
  statement: string;
  tablename: string;
  columns: Array<Column>;
};

export type ASTInsert = {
  statement: string;
  tablename: string;
  columnsNames: Array<string>;
  columnsValues: Array<string>;
};
