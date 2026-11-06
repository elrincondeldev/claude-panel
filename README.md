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
