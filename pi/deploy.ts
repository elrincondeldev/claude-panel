/**
 * Pushes the current UI and kiosk files to a running Pi and restarts the kiosk, without rebooting.
 *
 *   bun pi/deploy.ts [user@host]      (default panel@claude-panel.local)
 *
 * The files also land in /boot/firmware/claude-panel, so a full `setup.sh` re-run uses them.
 */
import { $ } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { writeBundle } from "./bundle.ts";

const host = process.argv[2] ?? "panel@claude-panel.local";
const remote = [
  "rm -rf /tmp/claude-panel-bundle && mkdir /tmp/claude-panel-bundle",
  "tar -xzf - -C /tmp/claude-panel-bundle",
  "sudo rm -rf /boot/firmware/claude-panel",
  "sudo cp -r /tmp/claude-panel-bundle /boot/firmware/claude-panel",
  "sudo bash /boot/firmware/claude-panel/setup.sh --app",
].join(" && ");

const staging = await mkdtemp(`${tmpdir()}/claude-panel-`);
try {
  await writeBundle(staging);
  // Keep macOS metadata (._ files, xattrs) out of the archive; GNU tar on the Pi would warn about it.
  await $`tar --no-mac-metadata --no-xattrs -C ${staging} -czf - . | ssh -o BatchMode=yes ${host} ${remote}`;
  console.log(`Deployed to ${host}`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
