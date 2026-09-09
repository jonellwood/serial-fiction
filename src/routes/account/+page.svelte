<script lang="ts">
  import { createAuthClient } from 'better-auth/svelte';
  let { data } = $props();
  let message = $state('');
  async function logout() {
    const result = await createAuthClient().signOut();
    if (result.error) message = 'Could not sign out. Try again.';
    else window.location.assign('/');
  }
</script>

<div class="page-wrap narrow">
  <span class="eyebrow">MAKE YOURSELF AT HOME</span>
  <h1>Your account.</h1>
  <section class="panel">
    <h2>{data.user.name || 'Reader'}</h2>
    <p>{data.user.email}</p>
    <p class="tag">{data.user.role}</p>
    {#if data.user.role === 'author' || data.user.role === 'admin'}<a
        class="button"
        href="/admin">Open author studio →</a
      >{/if}<button class="text-link" onclick={logout}>Sign out</button>
    <p role="status">{message}</p>
  </section>
  <p>
    Reader appearance settings are saved on this device. Cross-device reading
    progress and permanent libraries are planned for the next milestones.
  </p>
</div>
