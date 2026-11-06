<script lang="ts">
  import { onMount } from "svelte";
  import type { AgentLink } from "../lib/agent-link.svelte.ts";
  import { clock } from "../lib/clock.svelte.ts";
  import { ago } from "../lib/panel.ts";

  let { link, onclose }: { link: AgentLink; onclose: () => void } = $props();

  const ROWS = 5;
  let page = $state(0);

  onMount(() => link.requestLibrary());

  const entries = $derived(link.library ?? []);
  const pageCount = $derived(Math.max(1, Math.ceil(entries.length / ROWS)));
  const rows = $derived(entries.slice(page * ROWS, page * ROWS + ROWS));
  const folder = (cwd: string) => cwd.split("/").pop() || cwd;

  // Same reason as in SessionSheet: only a fresh press on the backdrop closes the sheet.
  function closeOnBackdrop(e: PointerEvent) {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<div class="backdrop" role="presentation" onpointerdown={closeOnBackdrop}>
  <div class="sheet" role="dialog" aria-label="Pin sessions">
    <header>
      <span class="title">Pin sessions</span>
      <button class="close" onclick={onclose} aria-label="Close">×</button>
    </header>

    {#if link.library === null}
      <p class="empty">Loading…</p>
    {:else if entries.length === 0}
      <p class="empty">No sessions in the Claude desktop app</p>
    {:else}
      <ul>
        {#each rows as entry (entry.id)}
          <li>
            <button
              class="row"
              class:pinned={entry.pinned}
              onclick={() => link.send({ type: "pin", id: entry.id, pinned: !entry.pinned })}
            >
              <span class="mark"></span>
              <span class="name">{entry.name}</span>
              <span class="meta">{folder(entry.cwd)} · {ago(entry.lastActivityAt, clock.now)}</span>
            </button>
          </li>
        {/each}
      </ul>
      <nav>
        <button disabled={page === 0} onclick={() => page--} aria-label="Previous page">‹</button>
        <span>{page + 1}/{pageCount}</span>
        <button disabled={page >= pageCount - 1} onclick={() => page++} aria-label="Next page">›</button>
      </nav>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--inset);
    background: rgb(0 0 0 / 0.75);
  }

  .sheet {
    display: flex;
    flex-direction: column;
    width: calc(100% - 16px);
    max-width: 452px;
    height: calc(100% - 16px);
    padding: 4px 10px 6px;
    background: var(--tile);
    border: 1px solid var(--accent);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    font-family: var(--font-label);
    font-size: 12px;
  }

  .close {
    width: 40px;
    height: 36px;
    font-size: 28px;
    color: var(--muted);
  }

  .empty {
    margin: auto;
    font-size: 18px;
    color: var(--muted);
  }

  ul {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 40px;
    padding: 0 8px;
    text-align: left;
    border: 1px solid var(--line);
  }

  .mark {
    flex: none;
    width: 10px;
    height: 10px;
    border: 1px solid var(--muted);
  }

  .pinned {
    border-color: var(--accent);
  }

  .pinned .mark {
    background: var(--accent);
    border-color: var(--accent);
  }

  .name,
  .meta {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .name {
    flex: 1;
    font-size: 19px;
  }

  .meta {
    max-width: 45%;
    font-size: 15px;
    color: var(--muted);
  }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    font-size: 16px;
    color: var(--muted);
  }

  nav button {
    width: 72px;
    height: 100%;
    font-size: 24px;
    color: var(--text);
  }

  nav button:disabled {
    visibility: hidden;
  }
</style>
