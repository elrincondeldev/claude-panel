/**
 * Phase 1 · Step 5 — Install (or remove) the panel hooks in ~/.claude/settings.json.
 *
 *   bun run hooks:install              add the hooks (idempotent, backs up first)
 *   bun run hooks:install --dry-run    show the resulting `hooks` block without writing
 *   bun run hooks:install --remove     remove ONLY the panel hooks
 *   bun run hooks:install --print      minimal settings with just the hooks (for `claude --settings`)
 *
 * Keeps whatever you already have: it only touches handlers that point at the panel URL.
 */
import { copyFile } from "node:fs/promises";
import { homedir } from "node:os";
import { buildPanelHooks, isPanelHook, PANEL_EVENTS } from "../src/hooks-config.ts";

type Handler = { type?: string; url?: string; [k: string]: unknown };
type MatcherGroup = { matcher?: string; hooks: Handler[] };
type Settings = { hooks?: Record<string, MatcherGroup[]>; [k: string]: unknown };

const args = new Set(process.argv.slice(2));
const SETTINGS = `${homedir()}/.claude/settings.json`;

if (args.has("--print")) {
  console.log(JSON.stringify({ hooks: buildPanelHooks() }, null, 2));
  process.exit(0);
}

const file = Bun.file(SETTINGS);
const exists = await file.exists();
const settings: Settings = exists ? await file.json() : {};

// 1. Drop any panel hooks already there → reinstalling never duplicates.
const hooks: Record<string, MatcherGroup[]> = {};
for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
  const kept = groups
    .map((group) => ({ ...group, hooks: group.hooks.filter((h) => !isPanelHook(h)) }))
    .filter((group) => group.hooks.length > 0);
  if (kept.length > 0) hooks[event] = kept;
}

// 2. Append the panel hooks after yours (unless --remove).
if (!args.has("--remove")) {
  for (const [event, groups] of Object.entries(buildPanelHooks())) {
    hooks[event] = [...(hooks[event] ?? []), ...groups];
  }
}

const next: Settings = { ...settings, hooks };
if (Object.keys(hooks).length === 0) delete next.hooks;

if (args.has("--dry-run")) {
  console.log(JSON.stringify(next.hooks ?? {}, null, 2));
  process.exit(0);
}

const backup = `${SETTINGS}.bak-claude-panel-${Date.now()}`;
if (exists) await copyFile(SETTINGS, backup);
await Bun.write(SETTINGS, JSON.stringify(next, null, 2) + "\n");

console.log(
  args.has("--remove")
    ? `Panel hooks removed from ${SETTINGS}`
    : `Panel hooks installed in ${SETTINGS} (${PANEL_EVENTS.length} events)`,
);
if (exists) console.log(`Backup: ${backup}`);
