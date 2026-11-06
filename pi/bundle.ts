import { $ } from "bun";
import { cp, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { loadConfig, panelUrl } from "../agent/src/config.ts";
import type { PanelConfig } from "../shared/protocol.ts";

const ROOT = dirname(import.meta.dir);

/** Builds the UI and writes everything the Pi runs into `dir`: firstboot/ files plus ui/ with its pairing config. */
export async function writeBundle(dir: string) {
  await $`bun run --cwd ${ROOT}/ui build`.quiet();
  await mkdir(dir, { recursive: true });
  await cp(`${ROOT}/pi/firstboot`, dir, { recursive: true });
  await cp(`${ROOT}/ui/dist`, `${dir}/ui`, { recursive: true });
  const { token } = await loadConfig();
  const config: PanelConfig = { agentUrl: await panelUrl(), token };
  await Bun.write(`${dir}/ui/config.json`, JSON.stringify(config, null, 2) + "\n");
}
