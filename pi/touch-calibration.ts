export type RawPoint = [x: number, y: number];

export interface Screen {
  width: number;
  height: number;
  /** Largest raw value the touch controller reports (12-bit ADS7846: 4095). */
  rawMax: number;
  /** How far inside each corner the user is assumed to tap, in screen px. */
  margin: number;
}

export const PANEL: Screen = { width: 480, height: 320, rawMax: 4095, margin: 6 };

export function average(points: RawPoint[]): RawPoint {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/**
 * libinput calibration matrix "a b c d e f" from raw taps on the top-left, top-right and
 * bottom-left corners. libinput maps normalized device coordinates (x, y) to normalized
 * screen coordinates as (a·x + b·y + c, d·x + e·y + f), so three points fix all six values,
 * including swapped or inverted axes.
 */
export function calibrationMatrix(
  [topLeft, topRight, bottomLeft]: [RawPoint, RawPoint, RawPoint],
  screen: Screen = PANEL,
): number[] {
  const { width, height, rawMax, margin } = screen;
  const rows = [topLeft, topRight, bottomLeft].map(([x, y]) => [x / rawMax, y / rawMax, 1]);
  const left = margin / width;
  const right = (width - margin) / width;
  const top = margin / height;
  const bottom = (height - margin) / height;
  return [...solve3(rows, [left, right, left]), ...solve3(rows, [top, top, bottom])];
}

/** Solves the 3×3 linear system `m · v = rhs` (Cramer's rule). */
function solve3(m: number[][], rhs: number[]): number[] {
  const det = (a: number[][]) =>
    a[0]![0]! * (a[1]![1]! * a[2]![2]! - a[1]![2]! * a[2]![1]!) -
    a[0]![1]! * (a[1]![0]! * a[2]![2]! - a[1]![2]! * a[2]![0]!) +
    a[0]![2]! * (a[1]![0]! * a[2]![1]! - a[1]![1]! * a[2]![0]!);
  const d = det(m);
  if (Math.abs(d) < 1e-9) throw new Error("the three taps are in a line; tap three different corners");
  return [0, 1, 2].map((col) => det(m.map((row, i) => row.map((v, j) => (j === col ? rhs[i]! : v)))) / d);
}
