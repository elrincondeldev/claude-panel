/**
 * Guided touch calibration for a running Pi: tap three corners, and it installs the matching
 * libinput calibration matrix and restarts the kiosk. Needed when the touch hits the wrong spot,
 * e.g. on a different panel or after rotating the screen.
 *
 *   bun pi/calibrate.ts [user@host]      (default panel@claude-panel.local)
 */
import { $ } from "bun";
import { average, calibrationMatrix, type RawPoint } from "./touch-calibration.ts";

const host = process.argv[2] ?? "panel@claude-panel.local";
const RULE = "/etc/udev/rules.d/99-claude-panel-touch.rules";
const CORNERS = ["TOP-LEFT", "TOP-RIGHT", "BOTTOM-LEFT"] as const;

console.log("Tap each corner as close to the edge as you can. Taps may open sessions on the Mac; that's fine.\n");

const taps = [] as unknown as [RawPoint, RawPoint, RawPoint];
for (const corner of CORNERS) {
  // Record on the Pi while the user taps; Enter ends the recording.
  const capture = Bun.spawn(["ssh", "-o", "BatchMode=yes", host, "sudo timeout 300 /opt/claude-panel/touch-capture.sh"], {
    stdout: "pipe",
    stderr: "inherit",
  });
  prompt(`Tap the ${corner} corner 3 times, then press Enter`);
  await Bun.sleep(300); // let the last tap travel over SSH
  capture.kill();
  const points = (await new Response(capture.stdout).text())
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" ").map(Number) as RawPoint);
  if (points.length === 0) throw new Error(`no taps recorded for ${corner}; run the calibration again`);
  taps.push(average(points));
  console.log(`  ${corner}: ${points.length} taps, raw ≈ ${taps.at(-1)!.map(Math.round).join(", ")}`);
}

const matrix = calibrationMatrix(taps)
  .map((v) => v.toFixed(5))
  .join(" ");
const rule = `ATTRS{name}=="ADS7846 Touchscreen", ENV{LIBINPUT_CALIBRATION_MATRIX}="${matrix}"`;
await $`ssh -o BatchMode=yes ${host} ${[
  `echo '${rule}' | sudo tee ${RULE} >/dev/null`,
  "sudo udevadm control --reload",
  "sudo udevadm trigger --subsystem-match=input --action=change",
  "sudo systemctl restart claude-panel-kiosk",
].join(" && ")}`;

console.log(`\nCalibrated: ${matrix}\nThe kiosk restarted with it; deploys keep it.`);
