import { describe, expect, test } from "bun:test";
import { formatCurrencyUsd, formatDateTime, formatPercent } from "../src/lib/analytics/formatters";
import { precisionAdd, precisionDiv, precisionMul, precisionSub, precisionToString } from "../src/lib/analytics/precision";
import { buildTrendline, forecastTrend } from "../src/lib/analytics/trendline";

describe("analytics lib", () => {
  test("precision math avoids float drift in decimal mode", () => {
    const sum = precisionAdd("0.1", "0.2", "decimal");
    expect(precisionToString(sum, 1)).toBe("0.3");
  });

  test("precision division supports decimal output", () => {
    const value = precisionDiv("1", "3", "decimal");
    expect(precisionToString(value, 4)).toBe("0.3333");
  });

  test("precision subtraction and multiplication are deterministic", () => {
    const diff = precisionSub("1", "0.9", "decimal");
    const product = precisionMul("1.2", "3", "decimal");
    expect(precisionToString(diff, 1)).toBe("0.1");
    expect(precisionToString(product, 1)).toBe("3.6");
  });

  test("formatters return stable outputs", () => {
    expect(formatCurrencyUsd(1234, 0)).toBe("$1,234");
    expect(formatPercent(0.125, 1)).toBe("12.5%");
    expect(formatDateTime("2025-01-15", "date").includes("2025")).toBeTrue();
  });

  test("linear trendline predicts expected values", () => {
    const model = buildTrendline(
      [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ],
      { mode: "linear" },
    );
    expect(Math.round(model.predict(4))).toBe(8);
  });

  test("polynomial degree is clamped and forecast generates points", () => {
    const points = [
      { x: 1, y: 1 },
      { x: 2, y: 4 },
      { x: 3, y: 9 },
      { x: 4, y: 16 },
    ];
    const output = forecastTrend(points, { mode: "polynomial", degree: 99 }, 3);
    expect(output.length).toBe(3);
    expect(output[0]!.x).toBeGreaterThan(4);
  });
});
