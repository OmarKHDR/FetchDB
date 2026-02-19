export type Type = 'SERIAL' | 'INT' | 'FLOAT' | 'VARCHAR';
export type Column = {
  name: string;
  data: string;
  type: Type;
  IsDeleted: boolean;
  IsPK: boolean;
  IsUnique: boolean;
  default: string;
  IsNullable: boolean;
  foreignkey: {
    table_name: string;
    column: string;
  };
};
