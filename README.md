# claude-panel

Touch panel (Raspberry Pi 4B + 3.5" screen) that shows your Claude Code sessions with pixel-art icons animated by state. Tap one and it opens on your Mac. Everything over WiFi.

- `agent/` — Mac agent (Bun + TypeScript)
- `docs/ROADMAP.md` — phased plan
- `docs/phase-1.md` — what we learned observing Claude Code

```bash
cd agent && bun install
bun run hooks:log         # watch hook events live
bun run watch:sessions    # watch sessions and their status
```
