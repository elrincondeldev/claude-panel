<script lang="ts">
  import type { PanelSession, SessionIcon } from "../../../shared/protocol.ts";
  import { clock } from "../lib/clock.svelte.ts";
  import { moodOf, statusLine } from "../lib/panel.ts";
  import { CHARACTERS } from "../lib/sprites/characters.ts";
  import Sprite from "./Sprite.svelte";

  let {
    session,
    onclose,
    onopen,
    onpin,
    onicon,
  }: {
    session: PanelSession;
    onclose: () => void;
    onopen: () => void;
    onpin: (pinned: boolean) => void;
    onicon: (icon: SessionIcon) => void;
  } = $props();

  const COLORS = ["#ff6b1a", "#d97757", "#ffd23f", "#4cd964", "#3ccfe6", "#4f7cff", "#a66cff", "#ff5fa2", "#e8e8e8"];

  // Closing on pointerdown, not click: the finger that long-pressed to open this sheet
  // lifts over the backdrop, and that release must not close it again.
  function closeOnBackdrop(e: PointerEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<div class="backdrop" role="presentation" onpointerdown={closeOnBackdrop}>
  <div class="sheet" role="dialog" aria-label={session.name}>
    <header>
      <Sprite character={session.icon.character} color={session.icon.color} mood={moodOf(session, clock.now)} scale={2} />
      <div class="title">
        <span class="name">{session.name}</span>
        <span class="status">{statusLine(session, clock.now)}</span>
      </div>
      <button class="close" onclick={onclose} aria-label="Close">×</button>
    </header>

    <div class="actions">
      <button class="primary" onclick={onopen}>Open on Mac</button>
      <button onclick={() => onpin(!session.pinned)}>{session.pinned ? "Unpin" : "Pin"}</button>
    </div>

    <div class="choices">
      {#each CHARACTERS as c (c.id)}
        <button
          class="character"
          class:selected={c.id === session.icon.character}
          onclick={() => onicon({ character: c.id, color: session.icon.color })}
          aria-label={c.label}
        >
          <Sprite character={c.id} color={session.icon.color} mood="idle" scale={2} />
        </button>
      {/each}
    </div>

    <div class="choices">
      {#each COLORS as color (color)}
        <button
          class="swatch"
          class:selected={color === session.icon.color}
          style:background={color}
          onclick={() => onicon({ character: session.icon.character, color })}
          aria-label={color}
        ></button>
      {/each}
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.75);
  }

  .sheet {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 452px;
    padding: 10px 12px 12px;
    background: var(--tile);
    border: 1px solid var(--accent);
  }

  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .title {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .name,
  .status {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .name {
    font-size: 22px;
  }

  .status {
    font-size: 16px;
    color: var(--muted);
  }

  .close {
    width: 44px;
    height: 44px;
    font-size: 30px;
    line-height: 1;
    color: var(--muted);
  }

  .actions {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 8px;
  }

  .actions button {
    height: 40px;
    font-family: var(--font-label);
    font-size: 12px;
    border: 1px solid var(--accent);
  }

  .actions .primary {
    background: var(--accent);
    color: #000;
  }

  .choices {
    display: flex;
    justify-content: space-between;
  }

  .character {
    padding: 2px;
    border: 2px solid transparent;
  }

  .swatch {
    width: 40px;
    height: 32px;
    border: 2px solid transparent;
  }

  .selected {
    border-color: var(--text);
  }
</style>
