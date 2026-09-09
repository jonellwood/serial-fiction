<script lang="ts">
  import { enhance } from '$app/forms';
  import type { Book } from '$lib/types';
  let { book, message }: { book?: Book; message?: string } = $props();
  let title = $derived(book?.title || '');
  let slug = $derived(book?.slug || '');
  let editedSlug = $derived(!!book);
  function makeSlug() {
    if (!editedSlug)
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
  }
</script>

<form
  method="POST"
  use:enhance={() =>
    async ({ update }) => {
      await update({ reset: false });
    }}
  class="editor-form"
>
  {#if message}<p class="form-error" role="alert">{message}</p>{/if}
  <div class="form-grid">
    <label
      >Book title<input
        name="title"
        bind:value={title}
        oninput={makeSlug}
        required
        maxlength="180"
      /></label
    ><label
      >URL slug<input
        name="slug"
        bind:value={slug}
        oninput={() => (editedSlug = true)}
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
      /></label
    ><label
      >Subtitle<input name="subtitle" value={book?.subtitle || ''} /></label
    ><label
      >Author name<input
        name="author_name"
        value={book?.author_name || 'Alex Morgan'}
        required
      /></label
    >
  </div>
  <label
    >Description<textarea name="description" rows="4"
      >{book?.description || ''}</textarea
    ></label
  >
  <div class="form-grid">
    <label
      >Cover image URL<input
        name="cover_image_url"
        value={book?.cover_image_url || ''}
        placeholder="https://… or /covers/my-book.jpg"
      /></label
    ><label
      >Tags, separated by commas<input
        name="tags"
        value={book?.tags || ''}
        placeholder="Slow burn, Contemporary"
      /></label
    >
  </div>
  <label
    >Content notice<input
      name="content_notice"
      value={book?.content_notice || ''}
      placeholder="Optional content information for readers"
    /></label
  ><label
    >Publication status<select name="status" value={book?.status || 'draft'}
      ><option value="draft">Draft — only visible to the author</option><option
        value="published">Published — visible in the catalog</option
      ><option value="archived">Archived — hidden from readers</option></select
    ></label
  ><button class="button">{book ? 'Save book' : 'Create book'} →</button>
  <p class="fine-print">
    Publish the book and at least one free chapter to open it to readers.
    Archive a book to remove it from the public catalog.
  </p>
</form>
