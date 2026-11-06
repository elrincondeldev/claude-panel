/**
 * Builds pi/out/claude-panel.img: Raspberry Pi OS Lite plus everything the panel needs.
 * On first boot cloud-init joins the WiFi, creates user `panel` with your SSH key and runs
 * firstboot/setup.sh, which installs the kiosk and reboots into it.
 *
 *   bun pi/build-image.ts      (asks for the WiFi, time zone and country)
 *
 * Flash the result with Raspberry Pi Imager → "Use custom" and skip OS customisation:
 * Imager's settings would replace the ones written here.
 */
import { $ } from "bun";
import { readlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import { writeBundle } from "./bundle.ts";

const IMAGE_URL = "https://downloads.raspberrypi.com/raspios_lite_arm64_latest";
const HOSTNAME = "claude-panel";

const ROOT = dirname(import.meta.dir);
const CACHE = `${ROOT}/pi/.cache`;
const OUT = `${ROOT}/pi/out/claude-panel.img`;

const wifi = await askWifi();
const timezone = ask("Time zone", macTimezone());
// The WiFi regulatory domain decides which channels and power levels the Pi may use.
const country = ask("WiFi country code", await macCountry()).toUpperCase();
const sshKey = await publicKey();
const compressed = await downloadImage();

console.log(`== writing ${OUT}`);
await mkdir(dirname(OUT), { recursive: true });
await $`xz -dc ${compressed} > ${OUT}`;

const { device, bootfs } = await attach(OUT);
try {
  await Bun.write(`${bootfs}/user-data`, userData(sshKey, timezone));
  await Bun.write(`${bootfs}/network-config`, networkConfig(wifi, country));
  await writeBundle(`${bootfs}/claude-panel`);
  await $`dot_clean -m ${bootfs}`.quiet().nothrow(); // drop macOS ._ files from the FAT partition
} finally {
  await $`hdiutil detach ${device}`.quiet();
}

console.log(`
Ready: ${OUT}
1. Raspberry Pi Imager → Choose OS → "Use custom" → this file. Say NO to OS customisation.
2. Put the card in the Pi and power it on. The first boot takes about 15 minutes and reboots once.
3. SSH: ssh panel@${HOSTNAME}.local   ·   setup log: /var/log/claude-panel-setup.log`);

function ask(question: string, fallback: string): string {
  return prompt(`${question} [${fallback}]:`)?.trim() || fallback;
}

function macTimezone(): string {
  try {
    return readlinkSync("/etc/localtime").split("zoneinfo/")[1] ?? "UTC";
  } catch {
    return "UTC";
  }
}

async function macCountry(): Promise<string> {
  const locale = await $`defaults read -g AppleLocale`.quiet().nothrow().text();
  return locale.match(/_([A-Z]{2})/)?.[1] ?? "US";
}

async function askWifi() {
  const ssid = prompt("WiFi name (SSID):")?.trim();
  if (!ssid) throw new Error("a WiFi name is required");
  // read -s keeps the password off the screen and out of any command line.
  const proc = Bun.spawn(["bash", "-c", 'read -rs -p "WiFi password: " p; echo >&2; printf %s "$p"'], {
    stdin: "inherit",
    stdout: "pipe",
    stderr: "inherit",
  });
  const password = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) throw new Error("could not read the WiFi password");
  return { ssid, password };
}

async function publicKey(): Promise<string> {
  for (const name of ["id_ed25519.pub", "id_rsa.pub"]) {
    const file = Bun.file(`${homedir()}/.ssh/${name}`);
    if (await file.exists()) return (await file.text()).trim();
  }
  throw new Error("no SSH public key in ~/.ssh (create one with ssh-keygen -t ed25519)");
}

/** Latest Raspberry Pi OS Lite (64-bit), cached in pi/.cache and checked against its SHA-256. */
async function downloadImage(): Promise<string> {
  const url = (await fetch(IMAGE_URL, { method: "HEAD" })).url; // follows the "latest" redirect
  const file = `${CACHE}/${basename(url)}`;
  await mkdir(CACHE, { recursive: true });
  if (!(await Bun.file(file).exists())) {
    console.log(`== downloading ${basename(url)}`);
    await $`curl -fL --progress-bar -o ${file}.part ${url}`;
    await $`mv ${file}.part ${file}`;
  }
  const expected = (await (await fetch(`${url}.sha256`)).text()).split(/\s+/)[0];
  const actual = (await $`shasum -a 256 ${file}`.text()).split(/\s+/)[0];
  if (!expected || expected !== actual) throw new Error(`checksum mismatch for ${file}`);
  return file;
}

/** Attaches the raw image without root; macOS mounts its FAT boot partition. */
async function attach(image: string) {
  const lines = (await $`hdiutil attach -imagekey diskimage-class=CRawDiskImage ${image}`.text()).trim().split("\n");
  const device = lines[0]!.split(/\s+/)[0]!;
  const bootfs = lines.map((line) => line.split("\t").at(-1)!.trim()).find((m) => m.startsWith("/Volumes/"));
  if (!bootfs) {
    await $`hdiutil detach ${device}`.quiet().nothrow();
    throw new Error("the boot partition did not mount");
  }
  return { device, bootfs };
}

// JSON strings are valid YAML scalars, so any key, SSID or password embeds safely.
function userData(sshKey: string, timezone: string) {
  return `#cloud-config
hostname: ${HOSTNAME}
manage_etc_hosts: true
timezone: ${JSON.stringify(timezone)}
users:
  - name: panel
    groups: users,adm,sudo,netdev,video,render,input,gpio,spi
    shell: /bin/bash
    lock_passwd: true
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${JSON.stringify(sshKey)}
ssh_pwauth: false
enable_ssh: true
runcmd:
  - [bash, /boot/firmware/claude-panel/setup.sh]
`;
}

function networkConfig({ ssid, password }: { ssid: string; password: string }, country: string) {
  return `network:
  version: 2
  wifis:
    renderer: NetworkManager
    wlan0:
      dhcp4: true
      regulatory-domain: ${JSON.stringify(country)}
      access-points:
        ${JSON.stringify(ssid)}:
          password: ${JSON.stringify(password)}
      optional: true
`;
}
