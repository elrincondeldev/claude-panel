<script lang="ts">
  import type { Mood } from "../lib/sprites/render.ts";
  import Sprite from "./Sprite.svelte";

  let { title, detail = "", mood = "idle", overlay = false }: { title: string; detail?: string; mood?: Mood; overlay?: boolean } =
    $props();
</script>

<div class="notice" class:overlay>
  <Sprite character="default" color="#ff6b1a" {mood} scale={4} />
  <p class="title">{title}</p>
  {#if detail}<p class="detail">{detail}</p>{/if}
</div>

<style>
  .notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 100%;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.8);
  }

  p {
    margin: 0;
  }

  .title {
    font-family: var(--font-label);
    font-size: 14px;
  }

  .detail {
    font-size: 18px;
    color: var(--muted);
  }
</style>
