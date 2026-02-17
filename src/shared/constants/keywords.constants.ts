export const dml_keywords = ['select', 'insert', 'update', 'delete'];
export const ddl_keywords = ['create', 'drop', 'alter'];
export const select_keywords = ['from', 'as', 'distinct', 'where'];
export const aggrigation = ['group', 'by', 'having'];
export const insert_keywords = ['into', 'values'];
export const order_keywords = ['order', 'asc', 'desc'];
export const joins_keyowrd = ['join', 'inner', 'outer', 'left', 'right'];

export const reserved_keywords = [
  ...dml_keywords,
  ...ddl_keywords,
  ...select_keywords,
  ...insert_keywords,
  ...aggrigation,
  ...order_keywords,
  ...joins_keyowrd,
];
