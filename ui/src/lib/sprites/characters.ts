export interface Character {
  id: string;
  label: string;
  /** 16 rows of 16 cells: B body, D darker, L lighter, F face plate, P pink, "." empty. */
  body: string[];
  /** Rows that replace the body from `row` down on alternate frames while working. */
  walk?: { row: number; rows: string[] };
  /** Top-left corners of the two 2×2 eyes. */
  eyes: { y: number; left: number; right: number };
  eyeColor?: string;
}

const EMPTY = "................";

/** The first one is the default. */
export const CHARACTERS: Character[] = [
  {
    id: "default",
    label: "Critter",
    body: [
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      ".BBBBBBBBBBBBBB.",
      ".BBBBBBBBBBBBBB.",
      "...BBBBBBBBBB...",
      "...DDDDDDDDDD...",
      "....D.D..D.D....",
      "....D.D..D.D....",
      EMPTY,
      EMPTY,
      EMPTY,
    ],
    walk: { row: 12, rows: ["...D...DD...D..."] },
    eyes: { y: 5, left: 5, right: 9 },
  },
  {
    id: "robot",
    label: "Robot",
    body: [
      EMPTY,
      ".......LL.......",
      ".......DD.......",
      "...BBBBBBBBBB...",
      "...BFFFFFFFFB...",
      "...BFFFFFFFFB...",
      "...BFFFFFFFFB...",
      "...BBBBBBBBBB...",
      "....DDDDDDDD....",
      "..BBBBBBBBBBBB..",
      "..B.BBBBBBBB.B..",
      "..B.BBBBBBBB.B..",
      "....BB....BB....",
      "....DD....DD....",
      EMPTY,
      EMPTY,
    ],
    walk: { row: 12, rows: [".....BB..BB.....", ".....DD..DD....."] },
    eyes: { y: 4, left: 5, right: 9 },
    eyeColor: "#9ff3ff",
  },
  {
    id: "ghost",
    label: "Ghost",
    body: [
      EMPTY,
      EMPTY,
      ".....BBBBBB.....",
      "....BBBBBBBB....",
      "...BLBBBBBBBB...",
      "...BLBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...BBBBBBBBBB...",
      "...B.BB.BB.BB...",
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
    ],
    walk: { row: 11, rows: ["...BB.BB.BB.B..."] },
    eyes: { y: 5, left: 5, right: 9 },
  },
  {
    id: "cat",
    label: "Cat",
    body: [
      EMPTY,
      EMPTY,
      EMPTY,
      "...BB......BB...",
      "...BPB....BPB...",
      "...BBBBBBBBBB...",
      "..BBBBBBBBBBBB..",
      "..BBBBBBBBBBBB..",
      "..BBBBBBBBBBBB..",
      "..BBBBBPPBBBBB..",
      "..BBBBBBBBBBBB..",
      "...BBBBBBBBBB...",
      "....DDDDDDDD....",
      EMPTY,
      EMPTY,
      EMPTY,
    ],
    eyes: { y: 7, left: 5, right: 9 },
  },
];
