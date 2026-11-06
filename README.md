# claude-panel

Touch panel (Raspberry Pi 4B + 3.5" screen) that shows your Claude Code sessions with pixel-art icons animated by state. Tap one and it opens on your Mac. Everything over WiFi.

- `agent/` — Mac agent (Bun + TypeScript): hooks + poll → session state → WebSocket for the panel
- `shared/protocol.ts` — the contract between the Mac and the panel

```bash
cd agent && bun install
bun run hooks:install     # forward Claude Code hook events to the agent (once)
bun test                  # run the test suite
bun run dev               # run the agent (hooks on 127.0.0.1:7777, panel on :7778)
bun run panel:client      # talk to the agent like the panel will
bun run service install   # run the agent at login (LaunchAgent)
```
