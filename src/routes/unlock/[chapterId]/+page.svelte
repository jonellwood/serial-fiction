<script lang="ts">
  import { money } from '$lib/pricing';
  let { data } = $props();
</script>

<svelte:head
  ><title>Unlock · {data.chapter.title}</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<div class="page-wrap narrow">
  <h1>{data.chapter.title}</h1>
  {#if data.aiDisclosure}<p class="notice">
      Author disclosure: {data.kind === 'chapter'
        ? 'contains AI-generated text'
        : 'includes AI-generated imagery'}.
    </p>{/if}
  {#if data.total !== null}<h2>
      {data.kind === 'chapter'
        ? 'Unlock chapter text'
        : data.kind === 'bundle'
          ? 'Complete your image collection'
          : 'Unlock illustration'} — {money(data.total)}
    </h2>
    <p>
      Online checkout is not available yet. You can request access for the site
      owner to arrange payment or grant complimentary access. Submitting this
      request does not charge you or unlock content.
    </p>
    <form method="POST">
      <input type="hidden" name="kind" value={data.kind} /><input
        type="hidden"
        name="image"
        value={data.imageId}
      /><input type="hidden" name="expected_total" value={data.total} /><button
        class="button">Request access</button
      >
    </form>
  {:else}<p class="notice">
      Your request has been recorded. Access will appear here after the site
      owner confirms it.
    </p>{/if}
  <h2>Your requests for this chapter</h2>
  {#each data.orders as order}<p>
      {order.kind} · {money(order.total)} · {order.status}
    </p>{/each}
  <a
    class="button outline"
    href="/read/{data.chapter.book_slug}/{data.chapter.slug}">Open chapter</a
  >
</div>
