import { describe, expect, test } from "bun:test";
import { CHARACTERS } from "./characters.ts";
import { SPRITE_SIZE, spriteFrame, type Mood } from "./render.ts";

const MOODS: Mood[] = ["idle", "working", "alert", "asking", "compacting", "error", "sleeping"];
const ORANGE = "#ff6b1a";

describe("characters", () => {
  for (const c of CHARACTERS) {
    test(`${c.id} is a well-formed 16×16 template`, () => {
      expect(c.body).toHaveLength(16);
      for (const row of [...c.body, ...(c.walk?.rows ?? [])]) expect(row).toMatch(/^[BDLFP.]{16}$/);
      if (c.walk) expect(c.walk.row + c.walk.rows.length).toBeLessThanOrEqual(16);
    });

    test(`${c.id} has both eyes on its body`, () => {
      for (const x of [c.eyes.left, c.eyes.right]) {
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          expect(c.body[c.eyes.y + dy]![x + dx]).not.toBe(".");
        }
      }
    });
  }
});

describe("spriteFrame", () => {
  test("every character and mood fits the sprite", () => {
    for (const c of CHARACTERS) {
      for (const mood of MOODS) {
        for (let frame = 0; frame < 16; frame++) {
          const pixels = spriteFrame(c.id, ORANGE, mood, frame);
          expect(pixels).toHaveLength(SPRITE_SIZE);
          expect(pixels.every((row) => row.length === SPRITE_SIZE)).toBe(true);
        }
      }
    }
  });

  test("the body is tinted with the icon color", () => {
    expect(spriteFrame("default", ORANGE, "idle", 1).flat()).toContain(ORANGE);
    expect(spriteFrame("default", "#4f7cff", "idle", 1).flat()).not.toContain(ORANGE);
  });

  test("unknown characters fall back to the default one", () => {
    expect(spriteFrame("nope", ORANGE, "idle", 1)).toEqual(spriteFrame("default", ORANGE, "idle", 1));
  });

  test("working moves between frames; idle stands still between blinks", () => {
    expect(spriteFrame("default", ORANGE, "working", 0)).not.toEqual(spriteFrame("default", ORANGE, "working", 1));
    expect(spriteFrame("default", ORANGE, "idle", 1)).toEqual(spriteFrame("default", ORANGE, "idle", 2));
  });

  test("alert, asking, error and sleeping carry their overlay", () => {
    const has = (mood: Mood, frame: number, color: string) => spriteFrame("default", ORANGE, mood, frame).flat().includes(color);
    expect(has("alert", 0, "#ffd23f")).toBe(true);
    expect(has("asking", 0, "#ffffff")).toBe(true);
    expect(has("error", 0, "#ff4d4d")).toBe(true);
    expect(has("sleeping", 0, "#c8d0dc")).toBe(true);
  });
});
