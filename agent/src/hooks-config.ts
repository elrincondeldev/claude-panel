/**
 * Which hooks the panel installs and where it sends them.
 *
 * Single source of truth: used by install-hooks.ts (global settings.json)
 * and by the isolated experiment (`--print` → experiments/hooks.test.json).
 */

/** Events the panel needs to derive each session's state. */
export const PANEL_EVENTS = [
  "SessionStart", // session born (or resumed / cleared / compacted)
  "UserPromptSubmit", // you send a message → it starts working
  "PreToolUse", // about to use a tool (Edit, Bash...)
  "PostToolUse", // the tool finished successfully
  "PostToolUseFailure", // the tool failed
  "Notification", // asks for permission, has been waiting on you, etc.
  "Stop", // finished its turn → your move
  "StopFailure", // the turn ended due to an API error
  "SubagentStart",
  "SubagentStop",
  "PreCompact", // compacting context
  "PostCompact",
  "SessionEnd", // the session closed
] as const;

export const DEFAULT_HOOK_URL = "http://127.0.0.1:7777/hook";

/**
 * `hooks` block for settings.json: one hook per event that forwards the JSON to the agent.
 *
 * Why `command` + curl instead of `"type": "http"`? Tested in Phase 1:
 * with `http`, when the agent is down every event leaves a "hook error"
 * (ECONNREFUSED) in the transcript of ALL your sessions. With curl + `|| true`
 * the hook always exits 0 with no output → silent. It is still synchronous,
 * so events arrive in order (async could reorder them).
 *
 * No `matcher` = all tools / all notification types.
 * curl -m 1: at most 1 s of waiting if the agent hangs.
 */
export function buildPanelHooks(url = DEFAULT_HOOK_URL) {
  const command = `/usr/bin/curl -s -m 1 -H 'Content-Type: application/json' --data-binary @- ${url} >/dev/null 2>&1 || true`;
  return Object.fromEntries(
    PANEL_EVENTS.map((event) => [event, [{ hooks: [{ type: "command", command, timeout: 2 }] }]]),
  );
}

/** Did the panel add this handler? (to reinstall or uninstall without touching yours) */
export function isPanelHook(handler: { type?: string; url?: string; command?: unknown }, url = DEFAULT_HOOK_URL) {
  if (handler.type === "http") return handler.url === url; // previous version
  return handler.type === "command" && typeof handler.command === "string" && handler.command.includes(url);
}
