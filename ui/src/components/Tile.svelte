<script lang="ts">
  import type { PanelSession } from "../../../shared/protocol.ts";
  import { clock } from "../lib/clock.svelte.ts";
  import { moodOf, statusLine } from "../lib/panel.ts";
  import Sprite from "./Sprite.svelte";

  let {
    session,
    focused,
    onopen,
    onmenu,
  }: { session: PanelSession; focused: boolean; onopen: () => void; onmenu: () => void } = $props();

  const LONG_PRESS_MS = 550;
  // Resistive touchscreens jitter; small movements still count as a press.
  const SLOP_PX = 12;

  let pressed = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let start = { x: 0, y: 0 };

  function down(e: PointerEvent) {
    pressed = true;
    start = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      timer = undefined;
      pressed = false;
      onmenu();
    }, LONG_PRESS_MS);
  }

  function up() {
    if (timer === undefined) return;
    cancel();
    onopen();
  }

  function move(e: PointerEvent) {
    if (timer !== undefined && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP_PX) cancel();
  }

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    pressed = false;
  }
</script>

<button
  class="tile {session.state}"
  class:pressed
  class:focused
  class:ended={!session.live}
  onpointerdown={down}
  onpointerup={up}
  onpointermove={move}
  onpointercancel={cancel}
  onpointerleave={cancel}
  oncontextmenu={(e) => e.preventDefault()}
>
  {#if session.pinned}<span class="pin"></span>{/if}
  <Sprite character={session.icon.character} color={session.icon.color} mood={moodOf(session, clock.now)} />
  <span class="name">{session.name}</span>
  <span class="status">{statusLine(session, clock.now)}</span>
</button>

<style>
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    padding: 4px 6px;
    overflow: hidden;
    background: var(--tile);
    border: 1px solid var(--accent-dim);
  }

  .name,
  .status {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1;
  }

  .name {
    font-size: 19px;
  }

  .status {
    font-size: 15px;
    color: var(--muted);
  }

  .pin {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 6px;
    height: 6px;
    background: var(--accent);
  }

  .working {
    border-color: var(--accent);
  }
  .working .status {
    color: var(--accent);
  }

  .needs_permission {
    border-color: var(--accent);
    animation: blink 1s steps(1) infinite;
  }
  .needs_permission .status {
    color: inherit;
  }
  @keyframes blink {
    50% {
      background: var(--accent);
      color: #000;
    }
  }

  .needs_input {
    border: 2px solid var(--accent);
  }
  .needs_input .status {
    color: var(--text);
  }

  .error {
    border-color: var(--danger);
  }
  .error .status {
    color: var(--danger);
  }

  .ended {
    opacity: 0.5;
  }
  .ended :global(canvas) {
    filter: grayscale(1);
  }

  .focused {
    background: var(--accent);
    color: #000;
  }
  .focused .status {
    color: #000;
  }
  /* Most sprites are orange too: outline them so they stay visible on the orange tile. */
  .focused :global(canvas) {
    filter: drop-shadow(2px 0 0 #000) drop-shadow(-2px 0 0 #000) drop-shadow(0 2px 0 #000) drop-shadow(0 -2px 0 #000);
  }
  /* The usual blink goes to orange, which a focused tile already is: blink to dark instead. */
  .focused.needs_permission {
    animation-name: blink-dark;
  }
  @keyframes blink-dark {
    50% {
      background: var(--tile);
      color: var(--text);
    }
  }
  .focused.pressed {
    filter: brightness(0.8);
  }

  .pressed {
    background: var(--accent);
    color: #000;
    animation: none;
  }
  .pressed .status {
    color: #000;
  }
</style>
