/**
 * Terminal stand-in for the panel: same connection, same commands.
 *
 *   ls                                sessions the panel would show (live or pinned)
 *   open <id>
 *   pin <id> | unpin <id>
 *   icon <id> <character> <#rrggbb>
 *   quit
 *
 * <id> is any unique prefix of a session id.
 */
import { PANEL_PORT, type ClientMessage, type PanelSession, type ServerMessage } from "../../shared/protocol.ts";
import { loadConfig } from "../src/config.ts";

const { token } = await loadConfig();
const sessions = new Map<string, PanelSession>();

let markReady: () => void;
const ready = new Promise<void>((resolve) => (markReady = resolve));

const ws = new WebSocket(`ws://127.0.0.1:${PANEL_PORT}/ws?token=${token}`);
ws.onopen = () => console.log(`connected to ws://127.0.0.1:${PANEL_PORT}/ws — type "help"`);
ws.onerror = () => console.error("connection error — is the agent running? (bun run dev)");
ws.onclose = (e) => {
  console.log(`disconnected (code ${e.code})`);
  process.exit(0);
};
ws.onmessage = (e) => {
  const msg = JSON.parse(String(e.data)) as ServerMessage;
  switch (msg.type) {
    case "snapshot":
      sessions.clear();
      for (const s of msg.sessions) sessions.set(s.id, s);
      list();
      markReady();
      break;
    case "session":
      sessions.set(msg.session.id, msg.session);
      console.log("▸", line(msg.session));
      break;
    case "removed":
      sessions.delete(msg.id);
      console.log("▸ removed", msg.id.slice(0, 8));
      break;
    case "error":
      console.log("✗", msg.message);
      break;
  }
};

function panelOrder(a: PanelSession, b: PanelSession) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.pinned && b.pinned) return (a.position ?? 0) - (b.position ?? 0);
  return b.stateSince - a.stateSince;
}

function ago(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function line(s: PanelSession) {
  const pin = s.pinned ? "★" : " ";
  const live = s.live ? "" : "(not live) ";
  return `${pin} ${s.id.slice(0, 8)}  ${s.state.padEnd(16)} ${s.name.slice(0, 32).padEnd(32)} ${live}${s.activity ?? ""} · ${ago(s.stateSince)}`;
}

function list() {
  const visible = [...sessions.values()].filter((s) => s.live || s.pinned).sort(panelOrder);
  console.log(visible.length ? visible.map(line).join("\n") : "(no sessions)");
}

function resolveId(prefix: string | undefined): string | null {
  const matches = prefix ? [...sessions.keys()].filter((id) => id.startsWith(prefix)) : [];
  if (matches.length === 1) return matches[0]!;
  console.log(matches.length > 1 ? `"${prefix}" matches several sessions` : `no session matches "${prefix ?? ""}"`);
  return null;
}

const send = (message: ClientMessage) => ws.send(JSON.stringify(message));

await ready;
for await (const input of console) {
  const [command, prefix, ...rest] = input.trim().split(/\s+/);
  if (!command) continue;
  if (command === "quit" || command === "exit") break;
  if (command === "ls") {
    list();
    continue;
  }
  if (command === "help") {
    console.log("ls · open <id> · pin <id> · unpin <id> · icon <id> <character> <#rrggbb> · quit");
    continue;
  }

  const id = resolveId(prefix);
  if (!id) continue;
  if (command === "open") send({ type: "open", id });
  else if (command === "pin" || command === "unpin") send({ type: "pin", id, pinned: command === "pin" });
  else if (command === "icon") send({ type: "icon", id, icon: { character: rest[0] ?? "", color: rest[1] ?? "" } });
  else console.log(`unknown command "${command}" — type "help"`);
}

// Input ended (quit, Ctrl+D or a pipe): give in-flight replies a moment before closing.
await Bun.sleep(500);
ws.close();
