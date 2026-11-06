<script lang="ts">
  import { clock } from "../lib/clock.svelte.ts";
  import { drawSprite, SPRITE_SIZE, spriteFrame, type Mood } from "../lib/sprites/render.ts";

  let { character, color, mood, scale = 3 }: { character: string; color: string; mood: Mood; scale?: number } = $props();

  let canvas: HTMLCanvasElement;

  $effect(() => {
    drawSprite(canvas.getContext("2d")!, spriteFrame(character, color, mood, clock.frame));
  });
</script>

<canvas
  bind:this={canvas}
  width={SPRITE_SIZE}
  height={SPRITE_SIZE}
  style:width="{SPRITE_SIZE * scale}px"
  style:height="{SPRITE_SIZE * scale}px"
></canvas>

<style>
  canvas {
    display: block;
    image-rendering: pixelated;
  }
</style>
