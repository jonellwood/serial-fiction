<script lang="ts">
  import BookForm from '$lib/components/BookForm.svelte';
  let { form } = $props();
</script>

<div class="page-wrap narrow">
  <a class="back-link" href="/admin/books">← All books</a>
  <h1>A new beginning.</h1>
  <BookForm message={form?.message} />
</div>
