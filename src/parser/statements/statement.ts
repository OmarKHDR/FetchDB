export class SqlStatement {
  statement_type:
    | 'select'
    | 'insert'
    | 'update'
    | 'delete'
    | 'create'
    | 'drop'
    | 'alter';
  table_name: string;
}
