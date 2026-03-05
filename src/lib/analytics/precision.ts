import Decimal from "decimal.js";

export type PrecisionMode = "float" | "decimal";

function toDecimal(value: string | number | bigint | Decimal) {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function precisionAdd(
  left: string | number | bigint | Decimal,
  right: string | number | bigint | Decimal,
  mode: PrecisionMode = "decimal",
) {
  if (mode === "float") return Number(left) + Number(right);
  return toDecimal(left).plus(toDecimal(right));
}

export function precisionSub(
  left: string | number | bigint | Decimal,
  right: string | number | bigint | Decimal,
  mode: PrecisionMode = "decimal",
) {
  if (mode === "float") return Number(left) - Number(right);
  return toDecimal(left).minus(toDecimal(right));
}

export function precisionMul(
  left: string | number | bigint | Decimal,
  right: string | number | bigint | Decimal,
  mode: PrecisionMode = "decimal",
) {
  if (mode === "float") return Number(left) * Number(right);
  return toDecimal(left).times(toDecimal(right));
}

export function precisionDiv(
  left: string | number | bigint | Decimal,
  right: string | number | bigint | Decimal,
  mode: PrecisionMode = "decimal",
) {
  if (mode === "float") return Number(left) / Number(right);
  return toDecimal(left).div(toDecimal(right));
}

export function precisionToNumber(value: number | Decimal) {
  return value instanceof Decimal ? value.toNumber() : value;
}

export function precisionToString(value: number | Decimal, decimals = 2) {
  if (value instanceof Decimal) return value.toFixed(decimals);
  return Number(value).toFixed(decimals);
}

