import { Column } from 'src/storage-engine/types/column.type';
import { ExprRes } from '../math/math.service';

export type ASTSelect = {
  statement: string;
  tablename: string;
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

export type ASTDelete = {
  statement: string;
  tablename: string;
  where: ExprRes | string;
};

export type ASTUpdate = {
  statement: string;
  tablename: string;
  column: Array<string>;
  value: Array<string>;
  where?: ExprRes | string;
};
