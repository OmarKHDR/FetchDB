export enum TYPES {
  VARCHAR = 'VARCHAR',
  NUMBER = 'NUMBER',
  SERIAL = 'SERIAL',
}

export type Column = {
  COLUMN_NAME: string;
  COLUMN_TYPE: TYPES;
  NULLABLE?: boolean;
  UNIQUE?: boolean;
  PRIMARY?: boolean;
  REFERENCE?: {
    TABLE_NAME: string;
    COLUMN_NAME: string;
  };
};
export type Table = {
  PATH: string;
  TABLE_NAME: string;
  TABLE_COLUMNS: Column[];
};

export type Schame = {
  DB_NAME: string;
  OWNER_NAME: string;
  TABLES: Table[];
};

export type index = number[];
