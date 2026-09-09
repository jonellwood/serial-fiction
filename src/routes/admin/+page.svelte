<script lang="ts">
  let { data } = $props();
</script>

<div class="page-wrap">
  <span class="eyebrow">A QUIET PLACE TO CREATE</span>
  <h1>Your author studio.</h1>
  <p>From a first sentence to someone’s next favorite story.</p>
  <div class="metrics">
    <div>
      <strong>{data.books.length}</strong><span>Stories in your collection</span
      >
    </div>
    <div>
      <strong
        >{data.books.filter((b) => b.status === 'published').length}</strong
      ><span>Published books</span>
    </div>
    <div>
      <strong
        >{data.books.reduce(
          (sum, b) => sum + Number(b.chapter_count || 0),
          0,
        )}</strong
      ><span>Published chapters</span>
    </div>
  </div>
  <a class="button" href="/admin/books/new">Create a book +</a>
  <section class="panel">
    <h2>Pick up where you left off</h2>
    {#each data.books as book}<a
        class="chapter-row"
        href="/admin/books/{book.id}"
        ><div>
          <h3>{book.title}</h3>
          <p>{book.author_name}</p>
        </div>
        <span>{book.status} →</span></a
      >{:else}<p>Create your first book to start writing.</p>{/each}
  </section>
</div>
