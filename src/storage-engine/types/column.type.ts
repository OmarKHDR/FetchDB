export type Type = 'serial' | 'int' | 'float' | 'varchar' | 'timestamp';
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
