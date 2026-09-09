<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head
  ><title>{page.status} · Between Lines</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<div class="page-wrap narrow empty-state">
  <span class="eyebrow">A PAUSE IN THE STORY · {page.status}</span>
  <h1>
    {page.status === 404
      ? 'This page slipped away.'
      : page.status === 403
        ? 'This chapter isn’t open yet.'
        : 'Something went wrong.'}
  </h1>
  <p>{page.error?.message}</p>
  <a class="button" href="/books">Back to the stories →</a
  >{#if page.error?.requestId}<small>Reference: {page.error.requestId}</small
    >{/if}
</div>
