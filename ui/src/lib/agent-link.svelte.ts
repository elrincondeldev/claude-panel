import { SvelteMap } from "svelte/reactivity";
import type { ClientMessage, LibraryEntry, PanelConfig, PanelSession, ServerMessage } from "../../../shared/protocol.ts";

export type LinkStatus = "connecting" | "online" | "offline";

const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 10_000;
// An address that never answers (wrong network, stale IP) would otherwise hang for minutes.
const CONNECT_TIMEOUT_MS = 5000;
const ERROR_VISIBLE_MS = 4000;

export async function loadPanelConfig(): Promise<PanelConfig> {
  const res = await fetch("./config.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`config.json: HTTP ${res.status}`);
  return res.json();
}

/**
 * Reactive mirror of the agent's sessions over a WebSocket that reconnects forever
 * with backoff (the Mac sleeps, the agent restarts), cycling through the agent's
 * addresses until one connects. While offline the last known sessions stay visible.
 */
export class AgentLink {
  readonly sessions = new SvelteMap<string, PanelSession>();
  /** Session in front in the desktop app. */
  focusedId = $state<string | null>(null);
  status = $state<LinkStatus>("connecting");
  /** Latest error from the agent or from sending; clears itself after a few seconds. */
  error = $state<string | null>(null);
  /** Desktop sessions that can be pinned, after requestLibrary(); null while loading. */
  library = $state<LibraryEntry[] | null>(null);

  #config: PanelConfig;
  #ws: WebSocket | null = null;
  #urlIndex = 0;
  #retryMs = RETRY_MIN_MS;
  #errorTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(config: PanelConfig) {
    this.#config = config;
    this.#connect();
  }

  /**
   * Open, pin and icon changes apply locally right away; the agent's echo then confirms them.
   * Without this, a second quick tap would build on the stale icon and undo the first.
   */
  send(message: ClientMessage) {
    if (this.#ws?.readyState !== WebSocket.OPEN) return this.#showError("Not connected to the Mac");
    this.#ws.send(JSON.stringify(message));
    if (message.type === "library") return;

    if (message.type === "open") this.focusedId = message.id;
    if (message.type === "pin" && this.library) {
      this.library = this.library.map((e) => (e.id === message.id ? { ...e, pinned: message.pinned } : e));
    }
    const session = this.sessions.get(message.id);
    if (!session) return;
    if (message.type === "pin") this.sessions.set(session.id, { ...session, pinned: message.pinned });
    if (message.type === "icon") this.sessions.set(session.id, { ...session, pinned: true, icon: message.icon });
  }

  requestLibrary() {
    this.library = null;
    this.send({ type: "library" });
  }

  #connect() {
    const urls = this.#config.agentUrls;
    const ws = new WebSocket(`${urls[this.#urlIndex % urls.length]}?token=${encodeURIComponent(this.#config.token)}`);
    this.#ws = ws;
    let opened = false;
    const giveUp = setTimeout(() => ws.close(), CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      opened = true;
      clearTimeout(giveUp);
      this.status = "online";
      this.#retryMs = RETRY_MIN_MS;
    };
    ws.onmessage = (e) => this.#receive(JSON.parse(String(e.data)) as ServerMessage);
    ws.onclose = () => {
      clearTimeout(giveUp);
      this.status = "offline";
      if (!opened) this.#urlIndex = (this.#urlIndex + 1) % urls.length;
      setTimeout(() => this.#connect(), this.#retryMs);
      this.#retryMs = Math.min(this.#retryMs * 2, RETRY_MAX_MS);
    };
  }

  #receive(msg: ServerMessage) {
    switch (msg.type) {
      case "snapshot":
        this.sessions.clear();
        for (const s of msg.sessions) this.sessions.set(s.id, s);
        this.focusedId = msg.focusedId;
        break;
      case "focus":
        this.focusedId = msg.id;
        break;
      case "library":
        this.library = msg.sessions;
        break;
      case "session":
        this.sessions.set(msg.session.id, msg.session);
        break;
      case "removed":
        this.sessions.delete(msg.id);
        break;
      case "error":
        this.#showError(msg.message);
        break;
    }
  }

  #showError(message: string) {
    this.error = message;
    clearTimeout(this.#errorTimer);
    this.#errorTimer = setTimeout(() => (this.error = null), ERROR_VISIBLE_MS);
  }
}
