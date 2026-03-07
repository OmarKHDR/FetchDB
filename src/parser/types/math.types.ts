export type ExprRes = {
	lhs: ExprRes | string;
	operator: string;
	rhs: ExprRes | string;
};