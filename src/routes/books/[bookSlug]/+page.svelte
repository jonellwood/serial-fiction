<script lang="ts">
  import { money } from '$lib/pricing';
  import Cover from '$lib/components/Cover.svelte';
  import { page } from '$app/state';
  let { data } = $props();
  let shared = $state('');
  const first = $derived(data.chapters.find((c) => c.is_free));
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: data.book.title, url: page.url.href });
      else {
        await navigator.clipboard.writeText(page.url.href);
        shared = 'Link copied';
      }
    } catch {
      shared = 'Sharing unavailable. Copy this page’s address.';
    }
  }
</script>

<svelte:head
  ><title>{data.book.title} · Between Lines</title><meta
    name="description"
    content={data.book.description}
  /><meta property="og:title" content={data.book.title} /><meta
    property="og:description"
    content={data.book.description}
  /><meta property="og:type" content="book" /><meta
    property="og:image"
    content={new URL(
      data.book.cover_image_url || '/icon-512.png',
      page.url.origin,
    ).href}
  /><meta name="twitter:card" content="summary" /><link
    rel="canonical"
    href={page.url.origin + page.url.pathname}
  /></svelte:head
>
<div class="page-wrap">
  <a class="back-link" href="/books">← All stories</a>
  <section class="book-detail">
    <Cover
      title={data.book.title}
      author={data.book.author_name}
      image={data.book.cover_image_url}
    />
    <div>
      <span class="eyebrow">A BETWEEN LINES ORIGINAL · {data.book.status}</span>
      <h1>{data.book.title}</h1>
      <p class="book-subtitle">{data.book.subtitle}</p>
      <p class="byline">
        By {data.book.author_name} · {data.chapters.length} published chapters
      </p>
      <p class="description">{data.book.description}</p>
      <div class="tags">
        {#each data.book.tags.split(',').filter(Boolean) as tag}<span
            >{tag}</span
          >{/each}
      </div>
      {#if data.book.content_notice}<p class="notice">
          Content note: {data.book.content_notice}
        </p>{/if}
      <div class="hero-actions">
        {#if first}<a class="button" href="/read/{data.book.slug}/{first.slug}"
            >Read the first chapter →</a
          >{/if}<button class="text-link" onclick={share}>Share story ↗</button>
      </div>
      <p aria-live="polite">{shared}</p>
    </div>
  </section>
  <section class="chapter-section">
    <div class="section-heading">
      <h2>The story so far</h2>
      <span>One chapter at a time</span>
    </div>
    {#each data.chapters as chapter}<a
        class="chapter-row"
        href={`/read/${data.book.slug}/${chapter.slug}`}
        ><span class="chapter-number"
          >{String(chapter.chapter_number).padStart(2, '0')}</span
        >
        <div>
          <h3>{chapter.title}</h3>
          <p>{chapter.summary}</p>
          {#if chapter.ai_generated}<p>
              Author disclosure: contains AI-generated text
            </p>{/if}
        </div>
        <span class:free={chapter.is_free} class="chapter-state"
          >{chapter.status !== 'published'
            ? chapter.status
            : chapter.is_free
              ? 'Free chapter'
              : chapter.owned
                ? 'In your library'
                : `Unlock · ${money(chapter.price_cents)}`}
          <span>{chapter.is_free ? '↗' : '◇'}</span></span
        ></a
      >{:else}<p>The first chapter is coming soon.</p>{/each}
    <div id="access" class="access-note">
      <h3>A little more to look forward to.</h3>
      <p>
        Chapter access and illustrations are available separately. Open a locked
        chapter to request access; online checkout is not available yet.
      </p>
    </div>
  </section>
</div>
