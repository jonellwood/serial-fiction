<script lang="ts">
  let { data, form } = $props();
</script>

<div class="page-wrap narrow">
  <h1>Account roles</h1>
  <p>
    Authors manage their own books and books shared with them. Admins manage the
    entire platform.
  </p>
  <form method="GET" class="editor-form">
    <label
      >Account email<input
        type="email"
        name="email"
        value={data.email}
        required
      /></label
    ><button class="button">Find account</button>
  </form>
  {#if form?.message}<p class="notice">{form.message}</p>{/if}
  {#each data.people as person}<form method="POST" class="editor-form">
      <h2>{person.email}</h2>
      <input type="hidden" name="id" value={person.id} /><label
        >Role<select name="role" value={person.role}
          ><option value="reader">Reader</option><option value="author"
            >Author</option
          ><option value="admin">Admin</option></select
        ></label
      ><button class="button" disabled={!person.verified}>Update role</button>
    </form>{:else}{#if data.email}<p>
        No account found. They must open their sign-in link first.
      </p>{/if}{/each}
</div>
