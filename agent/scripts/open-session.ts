/** Usage: bun run open <sessionId>, where sessionId is a UUID from `claude agents --json`. */
import { openSession } from "../src/open-session.ts";

const sessionId = process.argv[2] ?? "";
const result = await openSession(sessionId);

if (result.ok) {
  console.log("→", result.command.join(" "));
} else {
  console.error(`Could not open ${sessionId || "(no id)"}: ${result.error}`);
  console.error("Usage: bun run open <sessionId UUID>");
  process.exit(1);
}
