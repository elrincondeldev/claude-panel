import { describe, expect, test } from "bun:test";
import { DEFAULT_ICON, type PanelSession } from "../../../shared/protocol.ts";
import { ago, layoutPages, moodOf, statusLine } from "./panel.ts";

const NOW = 10_000_000;
let seq = 0;
function session(overrides: Partial<PanelSession> = {}): PanelSession {
  seq++;
  return {
    id: `00000000-0000-0000-0000-${String(seq).padStart(12, "0")}`,
    name: `session ${seq}`,
    cwd: "/tmp",
    state: "done",
    activity: null,
    live: true,
    stateSince: NOW,
    pinned: false,
    position: null,
    icon: DEFAULT_ICON,
    ...overrides,
  };
}

describe("layoutPages", () => {
  test("pinned by position first, then live sessions by name; ended unpinned are hidden", () => {
    const pages = layoutPages([
      session({ name: "zeta" }),
      session({ name: "pinned second", pinned: true, position: 1 }),
      session({ name: "alpha" }),
      session({ name: "gone", live: false, state: "ended" }),
      session({ name: "pinned first", pinned: true, position: 0, live: false, state: "ended" }),
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.sessions.map((s) => s.name)).toEqual(["pinned first", "pinned second", "alpha", "zeta"]);
  });

  test("splits into pages and flags the ones that need the user", () => {
    const sessions = Array.from({ length: 10 }, (_, i) => session({ name: `s${String(i).padStart(2, "0")}` }));
    sessions[9]!.state = "needs_permission";
    const pages = layoutPages(sessions, 8);
    expect(pages.map((p) => p.sessions.length)).toEqual([8, 2]);
    expect(pages.map((p) => p.attention)).toEqual([false, true]);
  });

  test("no sessions, no pages", () => {
    expect(layoutPages([])).toEqual([]);
  });
});

describe("moodOf", () => {
  test("maps states to moods", () => {
    expect(moodOf(session({ state: "working" }), NOW)).toBe("working");
    expect(moodOf(session({ state: "needs_permission" }), NOW)).toBe("alert");
    expect(moodOf(session({ state: "needs_input" }), NOW)).toBe("asking");
    expect(moodOf(session({ state: "ended" }), NOW)).toBe("sleeping");
  });

  test("a finished session dozes off after a while", () => {
    expect(moodOf(session({ state: "done", stateSince: NOW - 60_000 }), NOW)).toBe("idle");
    expect(moodOf(session({ state: "done", stateSince: NOW - 6 * 60_000 }), NOW)).toBe("sleeping");
  });
});

describe("text", () => {
  test("ago", () => {
    expect(ago(NOW, NOW)).toBe("now");
    expect(ago(NOW - 42_000, NOW)).toBe("42s");
    expect(ago(NOW - 5 * 60_000, NOW)).toBe("5m");
    expect(ago(NOW - 3 * 3600_000, NOW)).toBe("3h");
    expect(ago(NOW - 2 * 86400_000, NOW)).toBe("2d");
  });

  test("statusLine", () => {
    expect(statusLine(session({ state: "working", activity: "Bash: npm test" }), NOW)).toBe("Bash: npm test");
    expect(statusLine(session({ state: "done", stateSince: NOW - 5 * 60_000 }), NOW)).toBe("done · 5m");
    expect(statusLine(session({ state: "needs_permission", activity: "Claude needs your permission to use Bash" }), NOW)).toBe(
      "needs permission",
    );
  });
});
