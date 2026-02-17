export const EqualityOperator = ['<>', '!=', '='];
export const RationalityOperator = ['<', '>', '<=', '>='];
export const NullCheck = ['is null', 'is not null'];
export const listOperators = ['in', 'exists'];
export const LogicalOperators = ['and', 'or', 'not'];

export const ComparisionOperators = [
  ...EqualityOperator,
  ...RationalityOperator,
  ...NullCheck,
];
export const conditionalOperators = [
  ...ComparisionOperators,
  ...LogicalOperators,
];

export const binOperators = [
  ...EqualityOperator,
  ...RationalityOperator,
  'and',
  'or',
  'in',
];
export const unaryOperators = ['not', 'exists'];
