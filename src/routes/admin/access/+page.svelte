<script lang="ts">
  import { money } from '$lib/pricing';
  let { data, form } = $props();
</script>

<div class="page-wrap">
  <h1>Access requests</h1>
  <p>
    Confirm only after verifying an external payment, or choose complimentary
    access. No payments are processed here.
  </p>
  {#if form?.message}<p class="notice">{form.message}</p>{/if}
  {#each data.orders as order}<section class="panel">
      <h2>{order.title} · {order.kind}</h2>
      <p>{order.email} · {money(order.total)} · {order.status}</p>
      {#if order.status === 'pending'}<form
          method="POST"
          action="?/fulfill"
          class="editor-form"
        >
          <input type="hidden" name="id" value={order.id} /><label
            >Verified payment reference or gift reason<input
              name="reference"
              required
              maxlength="250"
            /></label
          ><label class="checkbox-label"
            ><input type="checkbox" name="complimentary" /> Complimentary — no payment
            credit toward future bundles</label
          ><button class="button">Confirm and grant access</button>
        </form>
        <form method="POST" action="?/cancel">
          <input type="hidden" name="id" value={order.id} /><button
            class="button outline">Cancel request</button
          >
        </form>{/if}
    </section>{/each}
  <h2>Active access grants</h2>
  {#each data.grants as grant}<section class="panel">
      <p>{grant.email} · {grant.type} · {grant.contentId}</p>
      <form method="POST" action="?/revoke">
        <input type="hidden" name="id" value={grant.id} /><label
          >Reason for revoking<input
            name="reason"
            required
            maxlength="250"
          /></label
        ><button class="button outline">Revoke access</button>
      </form>
    </section>{/each}
</div>
