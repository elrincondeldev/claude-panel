/**
 * Stand-in for the agent that prints raw hook events and appends them to
 * logs/hooks.jsonl. That file contains your prompts and replies; it is gitignored.
 * It listens on the agent's port, so run one or the other.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { HOOK_PORT } from "../src/config.ts";
import type { HookEvent } from "../src/state.ts";

const LOG_DIR = new URL("../logs/", import.meta.url).pathname;
const LOG_FILE = `${LOG_DIR}hooks.jsonl`;
await mkdir(LOG_DIR, { recursive: true });

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const COLOR: Record<string, string> = {
  SessionStart: "\x1b[32m",
  SessionEnd: "\x1b[90m",
  UserPromptSubmit: "\x1b[36m",
  PreToolUse: "\x1b[33m",
  PostToolUse: "\x1b[33m",
  PostToolUseFailure: "\x1b[31m",
  Notification: "\x1b[35m",
  Stop: "\x1b[32m",
  StopFailure: "\x1b[31m",
  SubagentStart: "\x1b[34m",
  SubagentStop: "\x1b[34m",
  PreCompact: "\x1b[36m",
  PostCompact: "\x1b[36m",
};

const oneLine = (value: unknown, max = 70) => String(value ?? "").replace(/\s+/g, " ").slice(0, max);

function detail(e: HookEvent): string {
  switch (e.hook_event_name) {
    case "SessionStart":
      return `source=${e.source} model=${oneLine(e.model, 30)}`;
    case "UserPromptSubmit":
      return `"${oneLine(e.prompt)}"`;
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure": {
      const input = (e.tool_input ?? {}) as Record<string, unknown>;
      return `${e.tool_name} ${oneLine(input.command ?? input.file_path ?? input.pattern ?? input.url, 60)}`;
    }
    case "Notification":
      return `${e.notification_type}: ${oneLine(e.message)}`;
    case "Stop":
      return `"${oneLine(e.last_assistant_message)}"`;
    case "StopFailure":
      return oneLine(e.error);
    case "SessionEnd":
      return `reason=${e.reason}`;
    case "SubagentStart":
    case "SubagentStop":
      return String(e.agent_type ?? "");
    default:
      return "";
  }
}

Bun.serve({
  hostname: "127.0.0.1",
  port: HOOK_PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (req.method !== "POST" || pathname !== "/hook") return new Response("not found", { status: 404 });

    let event: HookEvent;
    try {
      event = (await req.json()) as HookEvent;
    } catch {
      return new Response("bad json", { status: 400 });
    }

    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const name = event.hook_event_name;
    const where = `${event.session_id.slice(0, 8)}  ${DIM}${event.cwd.split("/").pop()}${RESET}`;
    console.log(`${time}  ${COLOR[name] ?? ""}${name.padEnd(18)}${RESET} ${where}  ${detail(event)}`);

    await appendFile(LOG_FILE, JSON.stringify({ receivedAt: Date.now(), event }) + "\n");
    return new Response(null, { status: 204 });
  },
});

console.log(`Listening for hooks on http://127.0.0.1:${HOOK_PORT}/hook → ${LOG_FILE}`);
