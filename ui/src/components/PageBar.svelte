<script lang="ts">
  import type { Page } from "../lib/panel.ts";

  let { pages, current, onchange }: { pages: Page[]; current: number; onchange: (index: number) => void } = $props();
</script>

<nav>
  <button class="arrow" disabled={current === 0} onclick={() => onchange(current - 1)} aria-label="Previous page">‹</button>
  <div class="dots">
    {#each pages as page, i (i)}
      <span class="dot" class:current={i === current} class:attention={page.attention && i !== current}></span>
    {/each}
  </div>
  <button class="arrow" disabled={current >= pages.length - 1} onclick={() => onchange(current + 1)} aria-label="Next page">›</button>
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
  }

  .arrow {
    width: 72px;
    height: 100%;
    font-size: 24px;
    line-height: 1;
    color: var(--text);
  }

  .arrow:disabled {
    visibility: hidden;
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 4px;
    background: var(--line);
  }

  .dot.current {
    width: 28px;
    background: var(--text);
  }

  .dot.attention {
    background: var(--accent);
  }
</style>
