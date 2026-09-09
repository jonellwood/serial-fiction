<script lang="ts">
  import BookForm from '$lib/components/BookForm.svelte';
  let { data, form } = $props();
</script>

<div class="page-wrap narrow">
  <a class="back-link" href="/admin/books">← All books</a>
  <div class="section-heading">
    <h1>Edit your story.</h1>
    <a class="text-link" href="/books/{data.book.slug}">Preview book ↗</a>
  </div>
  <section class="panel" id="chapters" aria-labelledby="chapters-title">
    <div class="section-heading">
      <h2 id="chapters-title">Chapters ({data.chapters.length})</h2>
      <a class="button small" href="/admin/books/{data.book.id}/chapters/new"
        >Add chapter +</a
      >
    </div>
    {#each data.chapters as chapter}<a
        class="chapter-row"
        href="/admin/books/{data.book.id}/chapters/{chapter.id}"
        ><span class="chapter-number">{chapter.chapter_number}</span>
        <div>
          <h3>{chapter.title}</h3>
          <p>{chapter.is_free ? 'Free' : 'Paid'} · {chapter.status}</p>
        </div>
        <span>→</span></a
      >{:else}<p>
        Write a first chapter and make it free to welcome your readers.
      </p>{/each}
  </section>
  <section aria-labelledby="book-details-title">
    <h2 id="book-details-title">Book details</h2>
    <BookForm book={data.book} message={form?.message} />
  </section>
</div>
