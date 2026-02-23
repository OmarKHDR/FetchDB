export type Type = 'SERIAL' | 'INT' | 'FLOAT' | 'VARCHAR';
export type Column = {
  name: string;
  type: Type;
  varcharLimint?: number;
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
