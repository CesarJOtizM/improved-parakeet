// Price Value Object - Wrapper for Money to maintain consistency in products domain
// Re-exports Money from stock domain for use in products domain

export { Money as Price } from '@stock/domain/valueObjects/money.valueObject';
export type { IMoneyProps as IPriceProps } from '@stock/domain/valueObjects/money.valueObject';
