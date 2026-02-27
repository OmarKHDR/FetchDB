export type Type =
  | 'serial'
  | 'int'
  | 'float'
  | 'varchar'
  | 'timestamp'
  | 'offset-serial';
export type Column = {
  name: string;
  type: Type;
  varcharLimit?: number;
  serial?: number;
  IsDeleted?: boolean;
  IsPK?: boolean;
  IsUnique?: boolean;
  default?: string;
  IsNullable?: boolean;
  foreignkey?: {
    table_name: string;
    column: string;
  };
};
