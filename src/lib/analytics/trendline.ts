export interface TrendPoint {
  x: number;
  y: number;
}

export type TrendlineMode = "linear" | "polynomial" | "logarithmic" | "exponential";

export interface TrendlineOptions {
  mode: TrendlineMode;
  degree?: number | undefined;
}

function solveLinearSystem(a: number[][], b: number[]) {
  const n = a.length;
  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let k = i + 1; k < n; k += 1) {
      if (Math.abs(a[k]?.[i] ?? 0) > Math.abs(a[maxRow]?.[i] ?? 0)) maxRow = k;
    }
    [a[i], a[maxRow]] = [a[maxRow]!, a[i]!];
    [b[i], b[maxRow]] = [b[maxRow]!, b[i]!];
    const pivot = a[i]?.[i] ?? 0;
    if (Math.abs(pivot) < 1e-12) continue;
    for (let k = i + 1; k < n; k += 1) {
      const factor = (a[k]?.[i] ?? 0) / pivot;
      for (let j = i; j < n; j += 1) {
        a[k]![j] = (a[k]?.[j] ?? 0) - factor * (a[i]?.[j] ?? 0);
      }
      b[k] = (b[k] ?? 0) - factor * (b[i] ?? 0);
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = b[i] ?? 0;
    for (let j = i + 1; j < n; j += 1) sum -= (a[i]?.[j] ?? 0) * x[j];
    const pivot = a[i]?.[i] ?? 0;
    x[i] = Math.abs(pivot) < 1e-12 ? 0 : sum / pivot;
  }
  return x;
}

function fitLinear(points: TrendPoint[]) {
  const n = points.length;
  if (n === 0) return { predict: (x: number) => 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = Math.abs(denom) < 1e-12 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { predict: (x: number) => slope * x + intercept };
}

function fitPolynomial(points: TrendPoint[], requestedDegree = 2) {
  const degree = Math.max(2, Math.min(4, Math.floor(requestedDegree)));
  const dim = degree + 1;
  const a: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const b = new Array(dim).fill(0);

  for (let row = 0; row < dim; row += 1) {
    for (let col = 0; col < dim; col += 1) {
      let sum = 0;
      for (const p of points) sum += p.x ** (row + col);
      a[row]![col] = sum;
    }
    let rhs = 0;
    for (const p of points) rhs += p.y * p.x ** row;
    b[row] = rhs;
  }
  const coeffs = solveLinearSystem(a, b);
  return {
    predict: (x: number) => coeffs.reduce((total, coeff, idx) => total + coeff * x ** idx, 0),
  };
}

function fitLogarithmic(points: TrendPoint[]) {
  const transformed = points.filter((point) => point.x > 0).map((point) => ({ x: Math.log(point.x), y: point.y }));
  const linear = fitLinear(transformed);
  return { predict: (x: number) => (x > 0 ? linear.predict(Math.log(x)) : 0) };
}

function fitExponential(points: TrendPoint[]) {
  const transformed = points.filter((point) => point.y > 0).map((point) => ({ x: point.x, y: Math.log(point.y) }));
  const linear = fitLinear(transformed);
  return { predict: (x: number) => Math.exp(linear.predict(x)) };
}

export function buildTrendline(points: TrendPoint[], options: TrendlineOptions) {
  if (options.mode === "polynomial") return fitPolynomial(points, options.degree);
  if (options.mode === "logarithmic") return fitLogarithmic(points);
  if (options.mode === "exponential") return fitExponential(points);
  return fitLinear(points);
}

export function forecastTrend(points: TrendPoint[], options: TrendlineOptions, forecastPoints: number) {
  if (!Number.isFinite(forecastPoints) || forecastPoints <= 0) return [] as TrendPoint[];
  if (points.length === 0) return [] as TrendPoint[];
  const model = buildTrendline(points, options);
  const sorted = points.slice().sort((left, right) => left.x - right.x);
  const lastX = sorted[sorted.length - 1]?.x ?? 0;
  const priorX = sorted.length > 1 ? (sorted[sorted.length - 2]?.x ?? lastX - 1) : lastX - 1;
  const step = Math.max(1e-6, lastX - priorX);
  const out: TrendPoint[] = [];
  for (let i = 1; i <= forecastPoints; i += 1) {
    const x = lastX + step * i;
    out.push({ x, y: model.predict(x) });
  }
  return out;
}

