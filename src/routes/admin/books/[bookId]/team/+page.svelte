<script lang="ts">
  let { data, form } = $props();
</script>

<div class="page-wrap narrow">
  <a href="/admin/books/{data.book.id}">← Back to book</a>
  <h1>Collaborators · {data.book.title}</h1>
  <p>Owner: {data.owner}</p>
  <p>
    Collaborators can edit this book and all its chapters and illustrations.
    Only the owner or an admin can change this list.
  </p>
  {#if form?.message}<p class="notice">{form.message}</p>{/if}
  {#if data.isAdmin}<form method="POST" class="editor-form">
      <input type="hidden" name="action" value="owner" /><label
        >Owner email<input name="email" type="email" required /></label
      ><button class="button">Assign owner</button>
    </form>{/if}
  <form method="POST" class="editor-form">
    <input type="hidden" name="action" value="add" /><label
      >Collaborator email<input name="email" type="email" required /></label
    ><button class="button">Add collaborator</button>
  </form>
  {#each data.collaborators as person}<form method="POST">
      <p>{person.email}</p>
      <input type="hidden" name="action" value="remove" /><input
        type="hidden"
        name="email"
        value={person.email}
      /><button class="button outline">Remove collaborator</button>
    </form>{/each}
</div>
