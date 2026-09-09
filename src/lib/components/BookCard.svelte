<script lang="ts">
  import Cover from './Cover.svelte';
  import type { Book } from '$lib/types';
  let { book, index = 0 }: { book: Book; index?: number } = $props();
</script>

<a class="book-card" href="/books/{book.slug}"
  ><Cover
    title={book.title}
    author={book.author_name}
    variant={index}
    image={book.cover_image_url}
  />
  <div class="book-card-body">
    <span class="eyebrow"
      >{book.tags.split(',')[0] || 'Serialized fiction'}</span
    >
    <h3>{book.title}</h3>
    <p>{book.subtitle}</p>
    <div class="card-meta">
      <span>{book.chapter_count || 0} chapters</span><span>Start reading ↗</span
      >
    </div>
  </div></a
>
