/**
 * Per-user data in ~/Library/Application Support/claude-panel: config.json holds the
 * pairing token (created on first run, mode 600) and panel.db the SQLite store.
 */
import { $ } from "bun";
import { randomBytes } from "node:crypto";
import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { PANEL_PORT } from "../../shared/protocol.ts";

export const HOOK_PORT = 7777;

/** WebSocket URL other devices on the LAN use to reach this Mac (Bonjour name). */
export async function panelUrl(): Promise<string> {
  const host = (await $`scutil --get LocalHostName`.quiet().nothrow().text()).trim();
  return `ws://${host ? `${host}.local` : "localhost"}:${PANEL_PORT}/ws`;
}

export interface Config {
  dataDir: string;
  dbPath: string;
  token: string;
}

export async function loadConfig(): Promise<Config> {
  const dataDir = `${homedir()}/Library/Application Support/claude-panel`;
  await mkdir(dataDir, { recursive: true });

  const path = `${dataDir}/config.json`;
  const file = Bun.file(path);
  const saved: { token?: string } = (await file.exists()) ? await file.json() : {};

  if (!saved.token) {
    saved.token = randomBytes(24).toString("base64url");
    await Bun.write(path, JSON.stringify(saved, null, 2) + "\n");
    await chmod(path, 0o600);
  }

  return { dataDir, dbPath: `${dataDir}/panel.db`, token: saved.token };
}
