<script lang="ts">
  let { data } = $props();
</script>

<div class="page-wrap">
  <div class="section-heading">
    <h1>Books & chapters.</h1>
    <a class="button" href="/admin/books/new">New book +</a>
  </div>
  {#each data.books as book}<a class="chapter-row" href="/admin/books/{book.id}"
      ><div>
        <h3>{book.title}</h3>
        <p>{book.chapter_count} published chapters</p>
      </div>
      <span>{book.status} →</span></a
    >{:else}<p>Your first book starts here.</p>{/each}
</div>
