export class ConditionDto {
  condition: BooleanExpression;
}

type BooleanExpression = boolean | Expression;

type Expression = {
  leftValue: string | BooleanExpression;
  rightValue: string | BooleanExpression;
  operand: string | undefined;
};
