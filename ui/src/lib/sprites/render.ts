import { CHARACTERS, type Character } from "./characters.ts";

export type Mood = "idle" | "working" | "alert" | "asking" | "compacting" | "error" | "sleeping";

/** Logical size of a sprite: a 16×16 character plus room above and to the right for overlays. */
export const SPRITE_SIZE = 24;

/** Row-major colors; null is transparent. */
export type Pixels = (string | null)[][];

const BODY_X = 4;
const BODY_Y = 6;

const GLYPHS = {
  bang: ["X", "X", "X", ".", "X"],
  question: ["XXX", "..X", ".XX", "...", ".X."],
  cross: ["X.X", ".X.", "X.X"],
  z: ["XXXX", "..X.", ".X..", "XXXX"],
  dot: ["X"],
};

const COLORS = {
  bang: "#ffd23f",
  question: "#ffffff",
  cross: "#ff4d4d",
  z: "#c8d0dc",
  dotOn: "#ffffff",
  dotOff: "#4a4f5a",
  face: "#16171c",
  pink: "#ff8fb1",
  eye: "#111216",
};

const Z_SPOTS: [number, number][] = [
  [15, 5],
  [18, 2],
  [20, 0],
];

type EyeStyle = "open" | "closed" | "squint";
type Overlay = { glyph: keyof typeof GLYPHS; x: number; y: number; color: string };

interface Pose {
  dx: number;
  dy: number;
  eyes: EyeStyle;
  walk: boolean;
  overlays: Overlay[];
}

/** `characterId` tinted with `color` ("#rrggbb"), in `mood`, at animation `frame` (any integer). */
export function spriteFrame(characterId: string, color: string, mood: Mood, frame: number): Pixels {
  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0]!;
  const pose = poseFor(mood, frame);
  const palette: Record<string, string> = {
    B: color,
    D: shade(color, -0.35),
    L: shade(color, 0.35),
    F: COLORS.face,
    P: COLORS.pink,
  };

  const pixels: Pixels = Array.from({ length: SPRITE_SIZE }, () => Array<string | null>(SPRITE_SIZE).fill(null));
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && y >= 0 && x < SPRITE_SIZE && y < SPRITE_SIZE) pixels[y]![x] = c;
  };

  const ox = BODY_X + pose.dx;
  const oy = BODY_Y + pose.dy;
  bodyRows(character, pose.walk).forEach((row, y) =>
    [...row].forEach((cell, x) => {
      const c = palette[cell];
      if (c) set(ox + x, oy + y, c);
    }),
  );

  const eyeColor = character.eyeColor ?? COLORS.eye;
  for (const [ex, mirrored] of [
    [character.eyes.left, false],
    [character.eyes.right, true],
  ] as const) {
    for (const [dx, dy] of eyeCells(pose.eyes, mirrored)) set(ox + ex + dx, oy + character.eyes.y + dy, eyeColor);
  }

  for (const o of pose.overlays) {
    GLYPHS[o.glyph].forEach((row, y) => [...row].forEach((cell, x) => cell === "X" && set(o.x + x, o.y + y, o.color)));
  }
  return pixels;
}

export function drawSprite(ctx: CanvasRenderingContext2D, pixels: Pixels) {
  ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  pixels.forEach((row, y) =>
    row.forEach((c, x) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
}

function poseFor(mood: Mood, frame: number): Pose {
  const still: Pose = { dx: 0, dy: 0, eyes: "open", walk: false, overlays: [] };
  switch (mood) {
    case "idle":
      return { ...still, eyes: frame % 16 === 0 ? "closed" : "open" };
    case "working":
      return { ...still, dy: frame % 2 ? -1 : 0, walk: frame % 2 === 1 };
    case "alert":
      return {
        ...still,
        dy: [0, -2, -3, -2][frame % 4]!,
        overlays: frame % 2 === 0 ? [{ glyph: "bang", x: 21, y: 0, color: COLORS.bang }] : [],
      };
    case "asking":
      return { ...still, dy: frame % 4 < 2 ? 0 : -1, overlays: [{ glyph: "question", x: 19, y: 0, color: COLORS.question }] };
    case "compacting":
      return {
        ...still,
        dy: frame % 2,
        eyes: "squint",
        overlays: [0, 1, 2].map((i) => ({ glyph: "dot", x: 17 + i * 2, y: 3, color: i === frame % 3 ? COLORS.dotOn : COLORS.dotOff })),
      };
    case "error":
      return {
        ...still,
        dx: [-1, 1, -1, 0, 0, 0, 0, 0][frame % 8]!,
        eyes: "squint",
        overlays: [{ glyph: "cross", x: 19, y: 1, color: COLORS.cross }],
      };
    case "sleeping": {
      const count = [1, 2, 3, 0][Math.floor(frame / 2) % 4]!;
      return { ...still, eyes: "closed", overlays: Z_SPOTS.slice(0, count).map(([x, y]) => ({ glyph: "z", x, y, color: COLORS.z })) };
    }
  }
}

function bodyRows(character: Character, walking: boolean): string[] {
  if (!walking || !character.walk) return character.body;
  const { row, rows } = character.walk;
  return character.body.map((line, y) => (y >= row && y < row + rows.length ? rows[y - row]! : line));
}

function eyeCells(style: EyeStyle, mirrored: boolean): [number, number][] {
  if (style === "open") return [[0, 0], [1, 0], [0, 1], [1, 1]];
  if (style === "closed") return [[0, 1], [1, 1]];
  return mirrored ? [[1, 0], [0, 1]] : [[0, 0], [1, 1]];
}

/** Mixes "#rrggbb" toward black (amount < 0) or white (amount > 0). */
function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(v + (target - v) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}
