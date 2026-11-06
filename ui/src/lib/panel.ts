import type { PanelSession } from "../../../shared/protocol.ts";
import type { Mood } from "./sprites/render.ts";

export const PER_PAGE = 8;
const DOZE_AFTER_MS = 5 * 60 * 1000;

export interface Page {
  sessions: PanelSession[];
  /** Some session on this page is waiting for the user. */
  attention: boolean;
  /** The page ends with the tile that pins more sessions. */
  hasAdd: boolean;
}

export function needsAttention(s: PanelSession) {
  return s.state === "needs_permission" || s.state === "needs_input";
}

/**
 * Pinned sessions by position, then the other live sessions by name, then one slot for the
 * add tile. Ordering by name rather than activity keeps tiles from jumping around as states change.
 */
export function layoutPages(sessions: Iterable<PanelSession>, perPage = PER_PAGE): Page[] {
  const pinned: PanelSession[] = [];
  const others: PanelSession[] = [];
  for (const s of sessions) {
    if (s.pinned) pinned.push(s);
    else if (s.live) others.push(s);
  }
  pinned.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  others.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const ordered = [...pinned, ...others];
  const pages: Page[] = [];
  for (let i = 0; i <= ordered.length; i += perPage) {
    const slice = ordered.slice(i, i + perPage);
    pages.push({ sessions: slice, attention: slice.some(needsAttention), hasAdd: i + perPage > ordered.length });
  }
  return pages;
}

export function moodOf(s: PanelSession, now: number): Mood {
  switch (s.state) {
    case "working":
      return "working";
    case "needs_permission":
      return "alert";
    case "needs_input":
      return "asking";
    case "compacting":
      return "compacting";
    case "error":
      return "error";
    case "ended":
      return "sleeping";
    case "idle":
    case "done":
      return now - s.stateSince > DOZE_AFTER_MS ? "sleeping" : "idle";
  }
}

/** "now", "42s", "5m", "3h", "2d". */
export function ago(since: number, now: number): string {
  const s = Math.max(0, Math.floor((now - since) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Second line of a tile, e.g. "Bash: npm test" or "done · 5m". */
export function statusLine(s: PanelSession, now: number): string {
  switch (s.state) {
    case "working":
      return s.activity ?? "working";
    case "needs_permission":
      return "needs permission";
    case "needs_input":
      return s.activity ?? "waiting for you";
    case "compacting":
      return "compacting";
    case "error":
      return s.activity ? `error · ${s.activity}` : "error";
    case "idle":
    case "done":
      return `${s.state} · ${ago(s.stateSince, now)}`;
    case "ended": // the process stopped; the session itself can be reopened
      return `closed · ${ago(s.stateSince, now)}`;
  }
}
