/**
 * One-time setup of the Mac side: dependencies, Claude Code hooks, the agent as a LaunchAgent
 * and the panel's pairing file. Safe to run again.
 */
import { $ } from "bun";
import { dirname } from "node:path";

const ROOT = dirname(import.meta.dir);
const AGENT = `${ROOT}/agent`;
const UI = `${ROOT}/ui`;

if (process.platform !== "darwin") throw new Error("the agent runs on macOS (it uses launchd and the Claude desktop app)");

console.log("== installing dependencies");
await $`bun install`.cwd(AGENT).quiet();
await $`bun install`.cwd(UI).quiet();

console.log("== forwarding Claude Code hook events to the agent");
await $`bun run hooks:install`.cwd(AGENT);

console.log("== starting the agent now and at every login");
await $`bun run service install`.cwd(AGENT);

console.log("== writing the panel's pairing file");
await $`bun run pair`.cwd(UI).quiet();

console.log(`
The Mac side is ready. Next:
  bun run image       build the Raspberry Pi image (asks for your WiFi)
  bun run deploy      push changes to a running Pi
  bun run calibrate   fix the touch if taps land in the wrong place`);
