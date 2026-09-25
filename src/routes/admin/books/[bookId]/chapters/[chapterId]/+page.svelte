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
    <div class="form-grid">
      <label
        >Chapter price · USD<input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={(data.chapter?.price_cents ?? 299) / 100}
        /></label
      ><label
        >All images price · USD<input
          name="image_bundle_price"
          type="number"
          min="0"
          step="0.01"
          value={(data.chapter?.image_bundle_cents ?? 5000) / 100}
        /></label
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
    ><label class="checkbox-label"
      ><input
        type="checkbox"
        name="ai_generated"
        checked={!!data.chapter?.ai_generated}
      /> This chapter contains AI-generated text</label
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
  {#if data.chapter}
    <section class="panel">
      <h2>Chapter illustrations</h2>
      <p>
        Save your chapter text before uploading. Place each image reference on
        its own line.
      </p>
      <p>
        Images are automatically resized to a maximum 1,600-pixel edge and
        compressed to WebP. Metadata is removed; only the web image and a small
        blurred preview are stored.
      </p>
      {#if !data.imageStorageAvailable}<p class="notice">
          Image uploads will be available once private cloud storage is
          configured. You can continue editing chapters.
        </p>{:else}
        <form
          method="POST"
          action="?/upload"
          enctype="multipart/form-data"
          class="editor-form"
        >
          <label
            >Image · JPEG, PNG or WebP, up to 3 MB<input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              required
            /></label
          >
          <label
            >Caption / alternative text<input
              name="caption"
              maxlength="300"
              required
            /></label
          >
          <label
            >Image price · USD<input
              name="image_price"
              type="number"
              min="0"
              step="0.01"
              value="9.99"
              required
            /></label
          >
          <label class="checkbox-label"
            ><input type="checkbox" name="ai_generated" /> This image is AI-generated</label
          >
          <label class="checkbox-label"
            ><input type="checkbox" name="included" /> Included with chapter — no
            separate image purchase</label
          >
          <p>
            Checking this sets the image price to $0.00. A $0.00 price also
            includes the image automatically. Readers still need access to the
            chapter.
          </p>
          <button class="button">Upload illustration</button>
        </form>
      {/if}
      {#each data.images as image}<div class="panel">
          <img
            src="/media/{image.id}"
            alt={image.caption}
            style="max-width:200px"
          />
          <form method="POST" action="?/imageDetails" class="editor-form">
            <input type="hidden" name="id" value={image.id} /><label
              >Caption<input
                name="caption"
                value={image.caption}
                required
                maxlength="300"
              /></label
            ><label
              >Price · USD<input
                name="image_price"
                type="number"
                min="0"
                step="0.01"
                value={image.price_cents / 100}
                required
              /></label
            ><label class="checkbox-label"
              ><input
                type="checkbox"
                name="ai_generated"
                checked={!!image.ai_generated}
              /> This image is AI-generated</label
            ><label class="checkbox-label"
              ><input
                type="checkbox"
                name="included"
                checked={image.price_cents === 0}
              /> Included with chapter — no separate image purchase</label
            >
            <p>
              To charge separately again, uncheck this and enter a price above
              $0.00.
            </p>
            <button class="button outline">Save image details</button>
          </form>
          <code>![Illustration](asset:{image.id})</code><button
            type="button"
            class="button outline"
            onclick={() =>
              (content += `\n\n![Illustration](asset:${image.id})\n\n`)}
            >Insert in chapter</button
          >
        </div>{/each}
    </section>
  {:else}<p>Save this chapter to upload illustrations.</p>{/if}
  {#if form && 'preview' in form}<section class="panel">
      <h2>Unsaved Markdown preview</h2>
      <div class="prose">{@html form.preview || ''}</div>
    </section>{/if}
</div>
