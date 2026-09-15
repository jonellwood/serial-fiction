<script lang="ts">
  let { children, data } = $props();
</script>

<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>
<div class="studio-shell">
  <nav class="studio-nav" aria-label="Author studio">
    <a href="/admin">Author studio</a><a href="/admin/books">Books & chapters</a
    >{#if data.user?.role === 'admin'}<a href="/admin/users">Account roles</a><a
        href="/admin/access">Access requests</a
      ><a href="/admin/audit">Activity</a>{/if}<a href="/books"
      >View public catalog ↗</a
    >
  </nav>
  {@render children()}
</div>
