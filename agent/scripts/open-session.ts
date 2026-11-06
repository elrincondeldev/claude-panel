/**
 * Phase 1 · Step 6 — Open a specific session in the Claude desktop app.
 *
 *   bun run open <sessionId>
 *
 * <sessionId> is the UUID from `claude agents --json`. Picks the method by itself:
 *
 *   · Session LIVE in the desktop app → open "claude://code/continue?session=local_…"
 *       Only navigates inside the app; spawns no process. Undocumented: the
 *       `local_…` id comes from ~/.claude/sessions/<pid>.json (internal file).
 *
 *   · Session CLOSED (or from a terminal) → claude --desktop --resume <id>
 *       Documented (CLI ≥ 2.1.285). Resumes the conversation in the app.
 *       Never use it on a live session: that would be two processes on the same conversation.
 */
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_ID = /^local_[A-Za-z0-9-]{1,64}$/;

interface LiveSession {
  pid: number;
  sessionId: string;
  hostSessionId?: string;
  entrypoint?: string;
}

const sessionId = process.argv[2];
if (!sessionId || !UUID.test(sessionId)) {
  console.error("Usage: bun run open <sessionId UUID>");
  process.exit(1);
}

/** Is the process still alive? (signal 0 = just check, kills nothing) */
function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Look the session up among the live ones Claude records in ~/.claude/sessions. */
async function findLive(id: string): Promise<LiveSession | undefined> {
  const dir = `${homedir()}/.claude/sessions`;
  for (const name of await readdir(dir).catch(() => [])) {
    if (!name.endsWith(".json")) continue;
    const info: LiveSession | null = await Bun.file(`${dir}/${name}`).json().catch(() => null);
    if (info?.sessionId === id && isAlive(info.pid)) return info;
  }
}

const live = await findLive(sessionId);

// Always an argument array, never a string for the shell:
// that way an odd id can't smuggle in commands (important once the Pi sends it).
let cmd: string[];
if (live && LOCAL_ID.test(live.hostSessionId ?? "")) {
  cmd = ["open", `claude://code/continue?session=${live.hostSessionId}`];
} else if (live) {
  console.error(`The session is live outside the desktop app (${live.entrypoint}, pid ${live.pid}).`);
  console.error("Open it in its terminal; resuming it here would duplicate the process.");
  process.exit(2);
} else {
  cmd = ["claude", "--desktop", "--resume", sessionId];
}

console.log("→", cmd.join(" "));
const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit" });
process.exit(await proc.exited);
