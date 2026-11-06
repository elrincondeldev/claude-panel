<script lang="ts">
  let { onclick }: { onclick: () => void } = $props();
</script>

<button class="add" {onclick} aria-label="Pin a session">
  <span class="plus">+</span>
  <span class="label">Pin a session</span>
</button>

<style>
  .add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    color: var(--muted);
    border: 1px dashed var(--line);
  }

  .add:active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .plus {
    font-size: 48px;
    line-height: 1;
  }

  .label {
    font-family: var(--font-label);
    font-size: 9px;
  }
</style>
