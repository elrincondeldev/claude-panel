import { $ } from "bun";
import { PANEL_PORT } from "../../shared/protocol.ts";
import { HOOK_PORT, loadConfig } from "./config.ts";
import { SessionHub } from "./hub.ts";
import { startPoller } from "./poller.ts";
import { startServers } from "./server.ts";
import { Store } from "./store.ts";

const config = await loadConfig();
const store = new Store(config.dbPath);
const hub = new SessionHub(store);
const servers = startServers({ hub, token: config.token, hookPort: HOOK_PORT, panelPort: PANEL_PORT });
const stopPoller = startPoller(hub);
const pruneTimer = setInterval(() => hub.prune(), 10 * 60 * 1000);

hub.subscribe((change) => {
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  if (change.type === "removed") return console.log(`${time}  ${change.id.slice(0, 8)}  removed`);
  const s = change.session;
  const flags = `${s.live ? "" : " (not live)"}${s.pinned ? " ★" : ""}`;
  console.log(`${time}  ${s.id.slice(0, 8)}  ${s.state.padEnd(16)} ${s.name}${flags}  ${s.activity ?? ""}`);
});

const host = (await $`scutil --get LocalHostName`.quiet().nothrow().text()).trim() || "localhost";
console.log(`claude-panel agent
  hooks : http://127.0.0.1:${HOOK_PORT}/hook
  panel : ws://${host}.local:${PANEL_PORT}/ws?token=…   (token in ${config.dataDir}/config.json)
  data  : ${config.dbPath}
`);

function shutdown() {
  clearInterval(pruneTimer);
  stopPoller();
  servers.stop();
  store.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
