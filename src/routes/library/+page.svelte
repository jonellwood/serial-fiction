<script lang="ts">
  let { data } = $props();
</script>

<div class="page-wrap narrow">
  <span class="eyebrow">A PLACE FOR YOUR STORIES</span>
  <h1>Your library.</h1>
  {#each data.chapters as chapter}<section class="panel">
      <p>{chapter.bookTitle}</p>
      <h2>{chapter.title}</h2>
      <a class="button" href="/read/{chapter.bookSlug}/{chapter.slug}"
        >Continue reading →</a
      >
    </section>{:else}<section class="empty-state">
      <h2>Your collection starts here.</h2>
      <p>Chapters and illustrations you unlock will appear here.</p>
      <a class="button" href="/books">Explore the collection →</a>
    </section>{/each}
</div>
