/** Prints `claude agents --json` every 2 s with a log of status transitions. */
import { $ } from "bun";
import type { AgentEntry } from "../src/state.ts";

const INTERVAL_MS = 2000;
const MAX_HISTORY = 15;

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CLEAR_SCREEN = "\x1b[2J\x1b[H";
const COLOR: Record<string, string> = { busy: "\x1b[33m", waiting: "\x1b[35m", idle: "\x1b[32m", gone: "\x1b[90m" };

const lastStatus = new Map<string, string>();
const history: string[] = [];

const clock = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
const short = (id: string) => id.slice(0, 8);
const folder = (cwd: string) => cwd.split("/").pop() || cwd;
const paint = (status: string) => `${COLOR[status] ?? ""}${status.padEnd(7)}${RESET}`;

function ago(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

async function listSessions(): Promise<AgentEntry[]> {
  const sessions: AgentEntry[] = await $`claude agents --json`.quiet().json();
  return sessions.sort((a, b) => a.startedAt - b.startedAt);
}

function recordTransitions(sessions: AgentEntry[]) {
  const seen = new Set<string>();
  for (const s of sessions) {
    seen.add(s.sessionId);
    const now = s.status ?? "?";
    const before = lastStatus.get(s.sessionId);
    if (before !== now) {
      history.unshift(
        `${clock()}  ${short(s.sessionId)}  ${before ?? "(new)"} → ${paint(now)} ${DIM}${s.name ?? folder(s.cwd)}${RESET}`,
      );
      lastStatus.set(s.sessionId, now);
    }
  }
  for (const [id, before] of lastStatus) {
    if (!seen.has(id)) {
      history.unshift(`${clock()}  ${short(id)}  ${before} → ${paint("gone")}`);
      lastStatus.delete(id);
    }
  }
  history.length = Math.min(history.length, MAX_HISTORY);
}

function render(sessions: AgentEntry[]) {
  const lines = [`claude agents --json · ${clock()} · ${sessions.length} sessions · Ctrl+C to quit`, ""];
  for (const s of sessions) {
    const name = (s.name ?? "(unnamed)").slice(0, 40).padEnd(40);
    lines.push(
      `${paint(s.status ?? "?")} ${short(s.sessionId)}  ${name}  ${DIM}${folder(s.cwd)} · pid ${s.pid ?? "-"} · ${ago(s.startedAt)}${RESET}`,
    );
  }
  lines.push("", "Transitions:", ...history);
  process.stdout.write(CLEAR_SCREEN + lines.join("\n") + "\n");
}

while (true) {
  try {
    const sessions = await listSessions();
    recordTransitions(sessions);
    render(sessions);
  } catch (err) {
    console.error("Error reading sessions:", err);
  }
  await Bun.sleep(INTERVAL_MS);
}
