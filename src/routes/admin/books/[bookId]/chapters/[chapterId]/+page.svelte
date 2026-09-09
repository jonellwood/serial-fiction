<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  let { data, form } = $props();
  let content = $derived(data.chapter?.content_markdown || '');
</script>

<div class="page-wrap editor-wrap">
  <a class="back-link" href="/admin/books/{data.book.id}#chapters"
    >← All chapters · {data.book.title}</a
  >
  <h1>{data.chapter ? 'A little more to the story.' : 'Turn a blank page.'}</h1>
  {#if page.url.searchParams.has('saved')}<p class="notice" role="status">
      Chapter saved.
    </p>{/if}
  <form
    method="POST"
    action="?/save"
    use:enhance={() =>
      async ({ update }) => {
        await update({ reset: false, invalidateAll: false });
      }}
    class="editor-form"
  >
    {#if form && 'message' in form}<p role="alert" class="form-error">
        {form.message}
      </p>{/if}
    <div class="form-grid">
      <label
        >Chapter title<input
          name="title"
          required
          value={data.chapter?.title || ''}
        /></label
      ><label
        >URL slug<input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={data.chapter?.slug || ''}
          placeholder="the-first-encounter"
        /></label
      ><label
        >Chapter number<input
          name="chapter_number"
          type="number"
          min="1"
          required
          value={data.chapter?.chapter_number || 1}
        /></label
      ><label
        >Publication status<select
          name="status"
          value={data.chapter?.status || 'draft'}
          ><option value="draft">Draft</option><option value="published"
            >Published</option
          ><option value="archived">Archived</option></select
        ></label
      >
    </div>
    <label
      >Summary<input
        name="summary"
        value={data.chapter?.summary || ''}
      /></label
    ><label
      >Content notice<input
        name="content_notice"
        value={data.chapter?.content_notice || ''}
      /></label
    ><label class="checkbox-label"
      ><input
        name="is_free"
        type="checkbox"
        checked={!!data.chapter?.is_free}
      /> Free chapter — anyone may read once both book and chapter are published</label
    ><label
      >Chapter text · Markdown<textarea
        class="markdown-editor"
        name="content_markdown"
        rows="20"
        bind:value={content}
        placeholder="Every story starts somewhere…"></textarea></label
    >
    <div class="hero-actions">
      <button class="button">Save chapter →</button><button
        class="button outline"
        formaction="?/preview"
        formnovalidate>Preview Markdown</button
      >{#if data.chapter}<a
          class="text-link"
          href="/read/{data.book.slug}/{data.chapter.slug}"
          >Open saved reader preview ↗</a
        >{/if}
    </div>
  </form>
  {#if form && 'preview' in form}<section class="panel">
      <h2>Unsaved Markdown preview</h2>
      <div class="prose">{@html form.preview || ''}</div>
    </section>{/if}
</div>
