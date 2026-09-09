<script lang="ts">
  import { createAuthClient } from 'better-auth/svelte';
  import { magicLinkClient } from 'better-auth/client/plugins';
  let { data } = $props();
  const auth = createAuthClient({ plugins: [magicLinkClient()] });
  let email = $state('');
  let busy = $state(false);
  let sent = $state(false);
  let message = $state('');
  async function login(event: SubmitEvent) {
    event.preventDefault();
    if (data.originMismatch) return;
    busy = true;
    message = '';
    try {
      const result = await auth.signIn.magicLink({
        email,
        callbackURL: data.next,
        errorCallbackURL: '/login?error=invalid',
      });
      if (result.error)
        message =
          result.error.status === 429
            ? 'Too many sign-in requests. Please wait a minute before trying again.'
            : 'We couldn’t send your sign-in link. Please try again. If this continues, contact the site owner.';
      else sent = true;
    } catch {
      message = 'Unable to connect. Please try again.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="auth-wrap">
  <span class="eyebrow">YOUR NEXT CHAPTER AWAITS</span>
  <h1>
    {sent ? 'Check your inbox.' : 'Welcome to your'}{#if !sent}<br /><em
        >reading corner.</em
      >{/if}
  </h1>
  {#if data.originMismatch}
    <p role="alert" class="notice">
      Sign-in is configured for a different app address.
      <a class="text-link" href={data.loginURL}>Open {data.loginURL}</a>
    </p>
  {/if}
  {#if sent}<p>
      We sent a sign-in link to <strong>{email}</strong>. Open it within 10
      minutes to continue.
    </p>
    <button class="text-link" onclick={() => (sent = false)}
      >Use a different email</button
    >{:else}<p>No password to remember. Just a little link to let you in.</p>
    <form onsubmit={login}>
      <label
        >Email address<input
          type="email"
          autocomplete="email"
          bind:value={email}
          required
          placeholder="you@example.com"
        /></label
      ><button class="button" disabled={busy || data.originMismatch}
        >{busy ? 'Sending…' : 'Email me a sign-in link'} →</button
      >
    </form>{/if}{#if message || data.authError}<p
      class="form-error"
      role="alert"
    >
      {message ||
        'That link has expired or was already used. Request a new one.'}
    </p>{/if}
  <p class="fine-print">Your email stays private. Your stories stay yours.</p>
</div>
