# claude-panel

A small touchscreen on your desk that shows every Claude Code session running on your Mac, each with an animated pixel-art character that changes with what the session is doing. Tap a tile and that session opens on the Mac.

> **Not an official Anthropic project.** It is not affiliated with or endorsed by Anthropic. "Claude" is a trademark of Anthropic, PBC.

- **Live state per session**: working (with the tool in use, e.g. `Bash: npm test`), waiting for permission, asking you something, compacting, done, error, ended.
- **Tap to open** the session in the Claude desktop app. The session in front on the Mac is shown in solid orange.
- **Long-press** to pin a session, pick its character (critter, robot, ghost, cat) and its color. Pinned sessions stay on the panel after they end.
- **Over WiFi.** The Pi only shows the panel; everything else runs on the Mac.

## How it works

```
Mac                                                        Raspberry Pi (WiFi)
┌───────────────────────────────────────────────┐          ┌─────────────────────────────┐
│ Claude Code ─ hooks (curl) ─▶ agent :7777     │          │ cage + Chromium (kiosk)     │
│ claude agents --json ─ poll ─▶  (loopback)    │  WS      │   └ panel UI, 480×320       │
│                       agent :7778 ◀══════════════════════▶   tap → open, pin, icon     │
│  SQLite: sessions, pins · opens sessions      │  token   │                             │
└───────────────────────────────────────────────┘          └─────────────────────────────┘
```

- `agent/` (Bun + TypeScript): turns hook events and polls of `claude agents --json` into a state per session. It keeps pins and icons in SQLite and serves a token-protected WebSocket.
- `ui/` (Svelte 5 + Vite): the panel itself, a 480×320 web app.
- `pi/`: builds a ready-to-flash Raspberry Pi OS image that boots straight into the panel, plus tools to update and calibrate it.
- `shared/protocol.ts`: the contract between agent and panel.

The panel reaches the Mac by its LAN IP first, then by its Bonjour name (`<mac>.local`). Many home routers drop mDNS between WiFi clients, so the name alone isn't reliable.

## Hardware

| | Tested with |
|---|---|
| Board | Raspberry Pi 4 Model B |
| Screen | CUQI 3.5" 480×320 resistive touchscreen with case and fan: SPI, ILI9486 display, ADS7846/XPT2046 touch |
| Network | WiFi |

Other 3.5" ILI9486 SPI panels for the Pi should work. The HDMI variant of the screen is detected but untested.

## Requirements

- macOS with the Claude desktop app (sessions in its Code tab) and the Claude Code CLI 2.1.285 or newer
- [Bun](https://bun.sh) 1.3 or newer
- An SSH key in `~/.ssh` (`id_ed25519.pub` or `id_rsa.pub`)
- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) and a microSD card (8 GB or more)

## Quick start

```bash
git clone https://github.com/elrincondeldev/claude-panel.git
cd claude-panel
bun run setup    # dependencies, Claude Code hooks, agent at login, panel pairing
bun run image    # builds pi/out/claude-panel.img; asks for WiFi, time zone and country
```

1. Open Raspberry Pi Imager → **Choose OS → Use custom** → `pi/out/claude-panel.img`.
2. When asked about OS customisation, say **No**: it would replace the image's settings.
3. Put the card in the Pi and power it on. The first boot installs the kiosk and reboots into the panel; it takes a few minutes.
4. If taps land in the wrong place, run `bun run calibrate` and tap three corners.

The image creates user `panel` on `claude-panel.local`, reachable only with your SSH key: `ssh panel@claude-panel.local`.

## Updating

```bash
bun run deploy                              # push UI and kiosk changes to the running Pi (no reflash)
cd agent && bun run service install         # restart the agent after changing its code
```

## Development

```bash
bun test                                    # all tests (agent, UI, Pi tools)
cd ui && bun run check                      # type-check the Svelte app
cd ui && bun run dev                        # panel at http://localhost:5173 (view it at 480×320)
cd agent && bun run service uninstall && bun run dev   # run the agent in the foreground instead
```

Tools in `agent/`:
- `bun run panel:client` talks to the agent like the panel does.
- `bun run watch:sessions` prints `claude agents --json` live.
- `bun run hooks:log` prints raw hook events. It uses the agent's port, so stop the agent first.

## How Claude Code is observed

| Source | Used for | Documented? |
|---|---|---|
| Hooks in `~/.claude/settings.json` | Instant state changes | Yes |
| `claude agents --json` | Session names, who is alive, corrections for missed hooks | Yes |
| `claude --desktop --resume <id>` | Opening a closed session | Yes |
| `claude://code/continue?session=local_…` and `~/.claude/sessions/*.json` | Opening a session that is already live in the app | No |
| `setFocusedSession` lines in `~/Library/Logs/Claude/main.log` | Knowing which session is in front | No |

The undocumented parts may break with a Claude update. If they do, the panel keeps working without that feature.

The hooks are command hooks that pipe each event to `curl … || true`. Unlike `"type": "http"` hooks, they stay silent when the agent is not running.

## Security and privacy

- **Hook port (7777):** listens on loopback only.
- **Panel port (7778):** the only one on your network. It needs the pairing token and accepts just three commands (`open`, `pin`, `icon`) with validated arguments. Nothing is run through a shell.
- **What tiles show:** the activity line can contain tool details such as a shell command, so anyone who can see the panel can read them.
- **WiFi password:** goes into the image you build; it is never stored in the repository. After the first boot the Pi removes it from the card's boot partition, and NetworkManager keeps its own root-only copy.
- **Pairing token:** stays on the card; it only matters inside your network.
- **Gitignored:** `pi/out/`, `pi/.cache/`, `ui/public/config.json` and `agent/logs/`.

## Troubleshooting

| Symptom | Check |
|---|---|
| White or blank screen after first boot | Give it a few minutes. Then `ssh panel@claude-panel.local` and look at `/var/log/claude-panel-setup.log` and `journalctl -u claude-panel-kiosk` |
| "Mac asleep" on the panel | `cd agent && bun run service status`. If the macOS firewall is on, allow `bun` to accept incoming connections. If the Mac's IP changed, run `bun run deploy` (a DHCP reservation for the Mac avoids this) |
| Taps hit the wrong tile | `bun run calibrate` |
| The case covers part of the screen | Adjust `inset=top,right,bottom,left` (px) in `pi/firstboot/session.sh`, then `bun run deploy` |
| Remove everything from the Mac | `cd agent && bun run hooks:install --remove && bun run service uninstall` |

## License

[MIT](LICENSE)
