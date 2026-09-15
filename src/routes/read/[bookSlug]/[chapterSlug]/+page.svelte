<script lang="ts">
  import { money } from '$lib/pricing';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  let { data } = $props();
  let settings = $state(false);
  let theme = $state('sepia');
  let size = $state(21);
  let font = $state('serif');
  let lineHeight = $state(1.85);
  let width = $state(680);
  let progress = $state(0);
  const index = $derived(
    data.chapters.findIndex((c) => c.id === data.chapter.id),
  );
  const next = $derived(data.chapters[index + 1]);
  const previous = $derived(data.chapters[index - 1]);
  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('reader-settings') || '{}');
      if (['sepia', 'light', 'dark', 'system'].includes(saved.theme))
        theme = saved.theme;
      if (Number.isFinite(saved.size))
        size = Math.max(16, Math.min(32, saved.size));
      if (['serif', 'sans-serif', 'system-ui'].includes(saved.font))
        font = saved.font;
      if (Number.isFinite(saved.lineHeight))
        lineHeight = Math.max(1.4, Math.min(2.2, saved.lineHeight));
      if (Number.isFinite(saved.width))
        width = Math.max(480, Math.min(900, saved.width));
    } catch {
      /* Defaults remain available. */
    }
  });
  function save() {
    try {
      localStorage.setItem(
        'reader-settings',
        JSON.stringify({ theme, size, font, lineHeight, width }),
      );
    } catch {
      /* Optional preference storage. */
    }
  }
  function scroll() {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    progress =
      distance > 0
        ? Math.min(100, Math.round((window.scrollY / distance) * 100))
        : 100;
  }
</script>

<svelte:window onscroll={scroll} />
<svelte:head
  ><title>{data.chapter.title} · {data.book.title}</title><meta
    name="description"
    content={data.chapter.summary}
  /><meta
    property="og:title"
    content={`${data.chapter.title} — ${data.book.title}`}
  /><meta property="og:description" content={data.chapter.summary} /><meta
    property="og:image"
    content={new URL(
      data.book.cover_image_url || '/icon-512.png',
      page.url.origin,
    ).href}
  /><link
    rel="canonical"
    href={page.url.origin + page.url.pathname}
  />{#if !data.chapter.is_free || data.chapter.status !== 'published'}<meta
      name="robots"
      content="noindex,nofollow"
    />{/if}</svelte:head
>
<div
  class="reader reader-{theme}"
  style={`--reader-size:${size}px;--reader-font:${font};--reader-leading:${lineHeight};--reader-width:${width}px`}
>
  <header class="reader-header">
    <a href="/books/{data.book.slug}">← <span>{data.book.title}</span></a>
    <div>
      <span class="reader-percent">{progress}%</span><button
        class="icon-button"
        onclick={() => (settings = !settings)}
        aria-expanded={settings}
        aria-controls="reader-settings"
        >Aa <span class="sr-only">Reader settings</span></button
      >
    </div>
  </header>
  {#if settings}<section
      id="reader-settings"
      class="reader-settings"
      aria-label="Reader settings"
    >
      <label
        >Appearance<select bind:value={theme} onchange={save}
          ><option value="light">Light</option><option value="sepia"
            >Sepia</option
          ><option value="dark">Dark</option><option value="system"
            >System</option
          ></select
        ></label
      ><label
        >Typeface<select bind:value={font} onchange={save}
          ><option value="serif">Literary serif</option><option
            value="sans-serif">Sans serif</option
          ><option value="system-ui">System</option></select
        ></label
      ><label
        >Font size · {size}px<input
          type="range"
          min="16"
          max="32"
          bind:value={size}
          oninput={save}
        /></label
      ><label
        >Line spacing<input
          type="range"
          min="1.4"
          max="2.2"
          step="0.05"
          bind:value={lineHeight}
          oninput={save}
        /></label
      ><label
        >Page width<input
          type="range"
          min="480"
          max="900"
          step="20"
          bind:value={width}
          oninput={save}
        /></label
      >
    </section>{/if}
  <article class="reader-article">
    <div class="reader-title">
      <span class="eyebrow"
        >{data.book.title} · CHAPTER {String(
          data.chapter.chapter_number,
        ).padStart(2, '0')}</span
      >
      <h1>{data.chapter.title}</h1>
      <p>By {data.book.author_name}</p>
      <span class="ornament">✦</span>
    </div>
    {#if data.chapter.ai_generated}<p class="notice">
        Author disclosure: this chapter contains AI-generated text.
      </p>{/if}
    {#if data.chapter.status !== 'published'}<p class="notice">
        Author preview · This chapter is {data.chapter.status}.
      </p>{/if}{#if data.chapter.content_notice || data.book.content_notice}<p
        class="notice"
      >
        Content note: {data.chapter.content_notice || data.book.content_notice}
      </p>{/if}
    {#if data.remaining && !data.manager}<aside class="notice">
        <p>{data.remaining} illustrations available separately.</p>
        <a class="button outline" href="/unlock/{data.chapter.id}?kind=bundle"
          >Complete your image collection — {money(data.bundle)}</a
        >
      </aside>{/if}
    <div class="prose">
      {#each data.parts as part}{#if part.image}<figure
            class="story-illustration"
          >
            <div class="image-frame">
              <img
                src="/media/{part.image.id}{part.image.owned
                  ? ''
                  : '?preview=1'}"
                alt={part.image.owned
                  ? part.image.caption
                  : 'Blurred illustration preview'}
                loading="lazy"
              />{#if !part.image.owned}<a
                  class="button image-unlock"
                  href="/unlock/{data.chapter.id}?kind=image&image={part.image
                    .id}">Unlock image — {money(part.image.price_cents)}</a
                >{/if}
            </div>
            <figcaption>
              {part.image.caption}{#if part.image.ai_generated}<br /><span
                  >Author disclosure: AI-generated image</span
                >{/if}
            </figcaption>
          </figure>{:else}{@html part.html || ''}{/if}{/each}
    </div>
    <div class="reader-ending">
      <span class="ornament">✦</span>
      <p>End of chapter {data.chapter.chapter_number}</p>
      <h2>
        {next ? 'There’s more between the lines.' : 'A pause, not an ending.'}
      </h2>
      {#if next}<a class="button" href="/read/{data.book.slug}/{next.slug}"
          >Next chapter →</a
        >{:else}<p>
          {next
            ? 'The next chapter is locked. Return to the story page for availability.'
            : 'The next chapter is still taking shape. Come back soon.'}
        </p>
        <a class="button" href="/books/{data.book.slug}">Back to the story →</a
        >{/if}
    </div>
    <nav class="reader-chapters" aria-label="Chapter navigation">
      {#if previous}<a href="/read/{data.book.slug}/{previous.slug}"
          >← Previous chapter</a
        >{/if}<a href="/books/{data.book.slug}">All chapters</a>
    </nav>
  </article>
  <div class="reading-progress" style={`width:${progress}%`}></div>
</div>

<style>
  .story-illustration {
    margin: 2rem 0;
  }
  .image-frame {
    position: relative;
  }
  .image-frame img {
    display: block;
    width: 100%;
    border-radius: 8px;
  }
  .image-unlock {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: max-content;
    max-width: 90%;
    font-size: 1rem;
  }
  figcaption {
    font-size: 0.9rem;
    text-align: center;
  }
</style>
