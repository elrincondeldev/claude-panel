/**
 * Opens a session in the Claude desktop app.
 * - Live in the app: navigate with the undocumented `claude://code/continue?session=local_…`.
 *   The local id comes from ~/.claude/sessions/<pid>.json, an internal file that may change.
 * - Closed: `claude --desktop --resume <id>` (documented, CLI ≥ 2.1.285).
 * Resuming a live session would start a second process on the same conversation, so it is refused.
 */
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { isSessionId } from "./protocol-guard.ts";

const LOCAL_ID = /^local_[A-Za-z0-9-]{1,64}$/;

export type OpenResult = { ok: true; command: string[] } | { ok: false; error: string };

interface LiveSession {
  pid: number;
  sessionId: string;
  hostSessionId?: string;
  entrypoint?: string;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0); // signal 0 only checks that the process exists
    return true;
  } catch {
    return false;
  }
}

async function findLive(id: string, dir: string): Promise<LiveSession | undefined> {
  for (const name of await readdir(dir).catch(() => [])) {
    if (!name.endsWith(".json")) continue;
    const info: LiveSession | null = await Bun.file(`${dir}/${name}`).json().catch(() => null);
    if (info?.sessionId === id && isAlive(info.pid)) return info;
  }
}

/** Picks the command that would open the session, without running it. */
export async function planOpen(sessionId: string, sessionsDir = `${homedir()}/.claude/sessions`): Promise<OpenResult> {
  if (!isSessionId(sessionId)) return { ok: false, error: "invalid session id" };
  const live = await findLive(sessionId, sessionsDir);
  if (live && LOCAL_ID.test(live.hostSessionId ?? "")) {
    return { ok: true, command: ["open", `claude://code/continue?session=${live.hostSessionId}`] };
  }
  if (live) {
    return { ok: false, error: `live outside the desktop app (${live.entrypoint}, pid ${live.pid}): open it in its terminal` };
  }
  return { ok: true, command: ["claude", "--desktop", "--resume", sessionId] };
}

export async function openSession(sessionId: string): Promise<OpenResult> {
  const plan = await planOpen(sessionId);
  if (!plan.ok) return plan;

  const proc = Bun.spawn(plan.command, { stdout: "ignore", stderr: "pipe" });
  const code = await proc.exited;
  if (code !== 0) {
    const stderr = (await new Response(proc.stderr).text()).trim().slice(0, 200);
    return { ok: false, error: `${plan.command[0]} exited with ${code}${stderr ? `: ${stderr}` : ""}` };
  }
  return plan;
}
