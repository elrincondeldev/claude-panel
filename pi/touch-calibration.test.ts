import { expect, test } from "bun:test";
import { average, calibrationMatrix, PANEL, type RawPoint } from "./touch-calibration.ts";

/** Where a raw tap lands on screen, in px, once the matrix is applied. */
function project(matrix: number[], [x, y]: RawPoint): RawPoint {
  const nx = x / PANEL.rawMax;
  const ny = y / PANEL.rawMax;
  const [a, b, c, d, e, f] = matrix as [number, number, number, number, number, number];
  return [(a * nx + b * ny + c) * PANEL.width, (d * nx + e * ny + f) * PANEL.height];
}

test("taps measured on the CUQI 3.5\" land on their corners", () => {
  const topLeft = average([[3794, 419], [3841, 458], [3763, 454]]);
  const topRight = average([[355, 464], [282, 474], [329, 467]]);
  const bottomLeft = average([[3790, 3730], [3789, 3723], [3755, 3723]]);
  const matrix = calibrationMatrix([topLeft, topRight, bottomLeft]);

  expect(matrix.map((v) => Number(v.toFixed(3)))).toEqual([-1.148, -0.007, 1.079, 0.009, 1.201, -0.119]);
  const [x, y] = project(matrix, average([[340, 3700]])); // a bottom-right tap that was never measured
  expect(Math.round(x)).toBeGreaterThan(460);
  expect(Math.round(y)).toBeGreaterThan(300);
});

test("swapped axes are handled too", () => {
  // Raw x grows downwards and raw y grows to the right.
  const matrix = calibrationMatrix([
    [200, 200],
    [200, 3900],
    [3900, 200],
  ]);
  const [x, y] = project(matrix, [3900, 3900]);
  expect(Math.round(x)).toBe(PANEL.width - PANEL.margin);
  expect(Math.round(y)).toBe(PANEL.height - PANEL.margin);
});

test("three taps in a line are rejected", () => {
  expect(() =>
    calibrationMatrix([
      [100, 100],
      [2000, 100],
      [4000, 100],
    ]),
  ).toThrow("in a line");
});
