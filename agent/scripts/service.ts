/**
 * Runs the agent as a LaunchAgent: starts at login, restarts on crash.
 * It uses the same ports as `bun run dev`, so run one or the other.
 *
 *   bun run service install | uninstall | status | logs | print
 */
import { $ } from "bun";
import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { PANEL_PORT } from "../../shared/protocol.ts";

const LABEL = "com.claude-panel.agent";
const HOME = homedir();
const PLIST = `${HOME}/Library/LaunchAgents/${LABEL}.plist`;
const LOG = `${HOME}/Library/Logs/claude-panel/agent.log`;
const AGENT_DIR = dirname(import.meta.dir);
const DOMAIN = `gui/${process.getuid!()}`;

// launchd starts processes with a bare PATH; the agent needs `claude`.
const PATH = [`${HOME}/.local/bin`, `${HOME}/.bun/bin`, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

/** bootout returns before the job is gone; bootstrapping before that fails with "Input/output error". */
async function unload() {
  await $`launchctl bootout ${DOMAIN}/${LABEL}`.quiet().nothrow();
  for (let i = 0; i < 50; i++) {
    if ((await $`launchctl print ${DOMAIN}/${LABEL}`.quiet().nothrow()).exitCode !== 0) return;
    await Bun.sleep(100);
  }
  throw new Error(`${LABEL} did not unload`);
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function plist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(process.execPath)}</string>
    <string>${xml(`${AGENT_DIR}/src/main.ts`)}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(AGENT_DIR)}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${xml(PATH)}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(LOG)}</string>
  <key>StandardErrorPath</key><string>${xml(LOG)}</string>
</dict>
</plist>
`;
}

switch (process.argv[2]) {
  case "install": {
    await mkdir(dirname(LOG), { recursive: true });
    await Bun.write(PLIST, plist());
    await unload();
    await $`launchctl bootstrap ${DOMAIN} ${PLIST}`;
    console.log(`Installed and started ${LABEL}\n  plist: ${PLIST}\n  log:   ${LOG}`);
    break;
  }
  case "uninstall": {
    await unload();
    await rm(PLIST, { force: true });
    console.log(`Stopped and removed ${LABEL}`);
    break;
  }
  case "status": {
    const info = await $`launchctl print ${DOMAIN}/${LABEL}`.quiet().nothrow();
    if (info.exitCode !== 0) {
      console.log(`${LABEL} is not loaded`);
      break;
    }
    const text = info.stdout.toString();
    const field = (name: string) => text.match(new RegExp(`^\\s*${name} = (.+)$`, "m"))?.[1] ?? "?";
    console.log(`${LABEL}: state=${field("state")} pid=${field("pid")} runs=${field("runs")}`);
    const health = await fetch(`http://127.0.0.1:${PANEL_PORT}/health`).then((r) => r.json()).catch(() => null);
    console.log(health ? `health: ${JSON.stringify(health)}` : `health: no answer on :${PANEL_PORT}`);
    break;
  }
  case "logs":
    await $`tail -n 40 ${LOG}`.nothrow();
    break;
  case "print":
    console.log(plist());
    break;
  default:
    console.log("Usage: bun run service <install|uninstall|status|logs|print>");
    process.exit(1);
}
