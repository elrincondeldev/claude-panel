# claude-panel

Touch panel (Raspberry Pi 4B + 3.5" screen) that shows your Claude Code sessions with pixel-art icons animated by state. Tap one and it opens on your Mac. Everything over WiFi.

- `agent/` — Mac agent (Bun + TypeScript): hooks + poll → session state → WebSocket for the panel
- `ui/` — panel app (Svelte 5 + Vite), 480×320
- `shared/protocol.ts` — the contract between the two

```bash
cd agent && bun install
bun run hooks:install     # forward Claude Code hook events to the agent (once)
bun run dev               # run the agent (hooks on 127.0.0.1:7777, panel on :7778)
bun run service install   # or run it at login (LaunchAgent)

cd ../ui && bun install
bun run pair              # write public/config.json with the agent URL and token
bun run dev               # open http://localhost:5173
```

Tests: `bun test` in `agent/` and `ui/`; `bun run check` type-checks the UI.

## Raspberry Pi

```bash
bun pi/build-image.ts     # asks for the WiFi; writes pi/out/claude-panel.img
```

Flash it with Raspberry Pi Imager ("Use custom", no OS customisation) and power the Pi on. The first boot installs the kiosk and reboots into the panel (a few minutes). Then `ssh panel@claude-panel.local`; the setup log is `/var/log/claude-panel-setup.log`.

```bash
bun pi/deploy.ts          # push UI and kiosk changes to the running Pi (no reflash, no reboot)
```

The tile of the session in front in the Claude desktop app is shown in solid orange; the agent learns it from the app's log.
