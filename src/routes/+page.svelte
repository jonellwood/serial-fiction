<script lang="ts">
  import Cover from '$lib/components/Cover.svelte';
  import BookCard from '$lib/components/BookCard.svelte';
  let { data } = $props();
  const featured = $derived(
    data.books.find((b) => b.slug === 'the-hours-between') || data.books[0],
  );
</script>

<div class="home-page">
  <section class="creator-strip">
    <div class="avatar">am<span></span></div>
    <div>
      <strong>Alex Morgan</strong>
      <p>Independent storyteller. Collector of almosts.</p>
    </div>
    <span class="creator-label">FICTION, ONE CHAPTER AT A TIME</span>
  </section>
  <section class="hero">
    <div class="hero-copy">
      <span class="eyebrow"
        ><span class="tiny-star">✦</span> YOUR NEXT OBSESSION STARTS HERE</span
      >
      <h1>Some stories<br />stay <em>with you.</em></h1>
      <p>
        Slow-burning connections. Beautiful complications.<br
          class="desktop-only"
        /> Stories worth staying up for, one chapter at a time.
      </p>
      <div class="hero-actions">
        <a class="button" href="/books">Find your next read <span>→</span></a><a
          class="text-link"
          href={featured ? `/books/${featured.slug}` : '/books'}
          >Try a free chapter ↗</a
        >
      </div>
      <div class="hero-footnote">
        <span>◈</span> Your first chapter is always an invitation.
      </div>
    </div>
    {#if featured}<a class="featured-display" href="/books/{featured.slug}"
        ><span class="featured-label">THE FEATURED STORY</span>
        <div class="featured-cover">
          <Cover
            title={featured.title}
            author={featured.author_name}
            image={featured.cover_image_url}
          />
        </div>
        <div class="floating-note">
          <span>✦</span>
          <div>A little escape.<br /><em>Just one more chapter.</em></div>
        </div></a
      >{/if}
  </section>
  <section class="shelf">
    <div class="section-heading">
      <div>
        <span class="eyebrow">SETTLE IN. STAY A WHILE.</span>
        <h2>Stories to get lost in</h2>
      </div>
      <a class="text-link" href="/books">Explore all stories →</a>
    </div>
    <div class="book-grid">
      {#each data.books as book, index}<BookCard {book} {index} />{:else}<div
          class="empty-state"
        >
          <h3>The first story is on its way.</h3>
          <p>Something worth waiting for is taking shape.</p>
        </div>{/each}
    </div>
  </section>
  <section class="invitation">
    <span class="invitation-mark">✧</span>
    <div>
      <span class="eyebrow">NO COMMITMENT. JUST CURIOSITY.</span>
      <h2>The beginning is on me.</h2>
      <p>Explore a free first chapter. See where the story takes you.</p>
    </div>
    <a class="button outline" href="/books?filter=free">Discover free reads →</a
    >
  </section>
</div>
