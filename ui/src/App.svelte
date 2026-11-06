<script lang="ts">
  import Notice from "./components/Notice.svelte";
  import PageBar from "./components/PageBar.svelte";
  import SessionSheet from "./components/SessionSheet.svelte";
  import Tile from "./components/Tile.svelte";
  import { AgentLink, loadPanelConfig } from "./lib/agent-link.svelte.ts";
  import { layoutPages } from "./lib/panel.ts";

  let link = $state<AgentLink | null>(null);
  let configError = $state(false);
  let requestedPage = $state(0);
  let menuFor = $state<string | null>(null);

  loadPanelConfig().then(
    (config) => (link = new AgentLink(config)),
    () => (configError = true),
  );

  const pages = $derived(link ? layoutPages(link.sessions.values()) : []);
  const current = $derived(Math.min(requestedPage, Math.max(0, pages.length - 1)));
  const menuSession = $derived(menuFor ? link?.sessions.get(menuFor) : undefined);
</script>

<main>
  {#if configError}
    <Notice title="Not paired" detail="run `bun run pair` in ui/" mood="error" />
  {:else if link}
    {#if pages.length === 0}
      <Notice
        title={link.status === "online" ? "No sessions" : "Connecting"}
        detail={link.status === "online" ? "start Claude Code on your Mac" : ""}
        mood={link.status === "online" ? "idle" : "working"}
      />
    {:else}
      <div class="grid">
        {#each pages[current]!.sessions as session (session.id)}
          <Tile
            {session}
            focused={session.id === link.focusedId}
            onopen={() => link!.send({ type: "open", id: session.id })}
            onmenu={() => (menuFor = session.id)}
          />
        {/each}
      </div>
      <PageBar {pages} {current} onchange={(i) => (requestedPage = i)} />
    {/if}

    {#if link.status === "offline"}
      <Notice title="Mac asleep" detail="reconnecting…" mood="sleeping" overlay />
    {/if}

    {#if menuSession}
      {@const id = menuSession.id}
      <SessionSheet
        session={menuSession}
        onclose={() => (menuFor = null)}
        onopen={() => {
          link!.send({ type: "open", id });
          menuFor = null;
        }}
        onpin={(pinned) => link!.send({ type: "pin", id, pinned })}
        onicon={(icon) => link!.send({ type: "icon", id, icon })}
      />
    {/if}

    {#if link.error}
      <div class="toast">{link.error}</div>
    {/if}
  {/if}
</main>

<style>
  main {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 480px;
    height: 320px;
    padding: var(--inset);
    overflow: hidden;
    background: var(--bg);
  }

  .grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 6px;
    min-height: 0;
    padding: 6px 6px 0;
  }

  .toast {
    position: absolute;
    left: 50%;
    bottom: 30px;
    max-width: 440px;
    padding: 4px 10px;
    transform: translateX(-50%);
    font-size: 17px;
    background: var(--danger);
    color: #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
