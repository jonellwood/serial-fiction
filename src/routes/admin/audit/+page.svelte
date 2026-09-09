<script lang="ts">
  let { data } = $props();
</script>

<div class="page-wrap">
  <span class="eyebrow">THE WORK BEHIND THE WORDS</span>
  <h1>Studio activity.</h1>
  <p>The latest 100 publishing and editing events.</p>
  {#each data.events as event}<div class="chapter-row">
      <div>
        <h3>{event.action}</h3>
        <p>{event.type} · {event.id}</p>
      </div>
      <time datetime={event.at}>{new Date(event.at).toLocaleString()}</time>
    </div>{:else}<p>No changes recorded yet. Start with a new story.</p>{/each}
</div>
