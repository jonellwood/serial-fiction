<script lang="ts">
  import BookCard from '$lib/components/BookCard.svelte';
  let { data } = $props();
  let search = $state('');
  let tag = $state('All stories');
  const tags = $derived([
    'All stories',
    ...new Set(data.books.flatMap((b) => b.tags.split(',').filter(Boolean))),
  ]);
  const books = $derived(
    data.books.filter(
      (b) =>
        `${b.title} ${b.description} ${b.author_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (tag === 'All stories' || b.tags.split(',').includes(tag)),
    ),
  );
</script>

<svelte:head><title>Discover stories · Between Lines</title></svelte:head>
<div class="page-wrap">
  <span class="eyebrow">A SMALL COLLECTION. A WORLD TO EXPLORE.</span>
  <h1>Find your next <em>escape.</em></h1>
  <div class="catalog-controls">
    <div class="filter-tabs">
      {#each tags as item}<button
          class:selected={tag === item}
          onclick={() => (tag = item)}>{item}</button
        >{/each}
    </div>
    <label class="search-label"
      ><span class="sr-only">Search stories</span><input
        type="search"
        bind:value={search}
        placeholder="Search stories…"
      /></label
    >
  </div>
  <div class="book-grid">
    {#each books as book, index}<BookCard {book} {index} />{:else}<div
        class="empty-state"
      >
        <h2>No stories found.</h2>
        <p>Try another title or theme.</p>
        <button
          onclick={() => {
            search = '';
            tag = 'All stories';
          }}>Clear filters</button
        >
      </div>{/each}
  </div>
</div>
