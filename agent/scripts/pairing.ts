/** Prints the panel's config.json (a PanelConfig). It contains the pairing token: keep it off git. */
import type { PanelConfig } from "../../shared/protocol.ts";
import { loadConfig, panelUrl } from "../src/config.ts";

const { token } = await loadConfig();
const config: PanelConfig = { agentUrl: await panelUrl(), token };
console.log(JSON.stringify(config, null, 2));
