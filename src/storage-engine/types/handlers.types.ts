import { FileHandle } from 'fs/promises';

export type SchemaHandle = {
  schema: FileHandle;
  index: FileHandle;
  version?: number;
};
export type TableHandle = {
  table: FileHandle;
  index: FileHandle;
  rowCount?: number;
};

// export type Schemas = Record<string, SchemaHandle>
export type Tables = Record<string, TableHandle>