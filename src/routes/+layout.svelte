<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  let { data, children } = $props();
  function openGate(node: HTMLDialogElement) {
    node.showModal();
  }
  let accepted = $state(false);
  let mounted = $state(false);
  let dark = $state(false);
  const reader = $derived(page.url.pathname.startsWith('/read/'));
  onMount(() => {
    mounted = true;
    try {
      accepted = localStorage.getItem('age-attested') === 'yes';
      dark = localStorage.getItem('site-theme') === 'dark';
    } catch {
      /* Storage can be unavailable. */
    }
  });
  function accept() {
    accepted = true;
    try {
      localStorage.setItem('age-attested', 'yes');
    } catch {
      /* Optional persistence. */
    }
  }
  function toggleTheme() {
    dark = !dark;
    try {
      localStorage.setItem('site-theme', dark ? 'dark' : 'light');
    } catch {
      /* Optional persistence. */
    }
  }
</script>

<svelte:head
  ><title>Between Lines — Stories to stay with</title><meta
    name="description"
    content="A quiet home for compelling serialized fiction. Discover a story, read the first chapter, and stay a little longer."
  /></svelte:head
>
<div class:dark class="app-shell">
  <a class="skip-link" href="#main">Skip to content</a>
  {#if !reader}<header class="site-header">
      <a class="brand" href="/"
        ><span class="brand-symbol">◫</span> between lines<span
          class="brand-dot">.</span
        ></a
      >
      <nav aria-label="Main navigation">
        <a class:active={page.url.pathname === '/'} href="/">Home</a><a
          class:active={page.url.pathname.startsWith('/books')}
          href="/books">Discover</a
        ><a class:active={page.url.pathname === '/library'} href="/library"
          >My library</a
        >{#if data.user?.role === 'admin' || data.user?.role === 'author'}<a
            href="/admin">Studio</a
          >{/if}
      </nav>
      <div class="header-actions">
        <button
          class="icon-button"
          onclick={toggleTheme}
          aria-label="Toggle color theme">{dark ? '☀' : '☾'}</button
        ><a class="button small" href={data.user ? '/account' : '/login'}
          >{data.user ? 'My account' : 'Sign in'} <span>↗</span></a
        >
      </div>
    </header>{/if}
  <main id="main">{@render children()}</main>
  {#if !reader}<footer>
      <a class="brand" href="/">between lines.</a>
      <p>Good stories deserve a place of their own.</p>
      <span>Independent fiction · For readers 18+</span>
    </footer>
    <nav class="mobile-nav" aria-label="Mobile navigation">
      <a href="/">⌂<span>Home</span></a><a href="/books"
        >⌕<span>Discover</span></a
      ><a href="/library">▤<span>Library</span></a><a href="/account"
        >○<span>Account</span></a
      >
    </nav>{/if}
  {#if mounted && !accepted}<dialog
      use:openGate
      oncancel={(event) => event.preventDefault()}
      aria-labelledby="age-title"
      class="age-card"
    >
      <span class="eyebrow">BEFORE YOU TURN THE PAGE</span>
      <h2 id="age-title">A space for<br />grown-up stories.</h2>
      <p>
        This site is intended for adults and may contain sexually explicit
        fictional material. Please confirm that you are 18 or older.
      </p>
      <button class="button" onclick={accept}
        >I am 18 or older <span>→</span></button
      ><a class="quiet-link" href="https://www.google.com">Leave this site</a
      ><small>This is an age attestation, not identity verification.</small>
    </dialog>{/if}
</div>
