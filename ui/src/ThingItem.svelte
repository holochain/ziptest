<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";
  import type { ZipTestStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import SvgIcon from "./SvgIcon.svelte";

  const dispatch = createEventDispatcher()
  const { getStore } :any = getContext("store");
  let store: ZipTestStore = getStore();

  export let thingHash: EntryHash

  $: thing = store.things.get(thingHash)

</script>
<div class="wrapper">
    {#if $thing.status == "complete"}
      {@const thingData = $thing.value}
      <div class="thing-content">{thingData.content}
      </div>
      

    {:else if $thing.status == "pending"}
      <sl-skeleton
        effect="pulse"
        style="height: 10px; width: 100%"
        ></sl-skeleton>
    {:else if $thing.status == "error"}
      {$thing.error}
    {/if}
</div>
<style>
  .wrapper {
    width: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .thing-content {
        font-size: 16px;
        font-weight: bold;
        margin-right: 10px;
    }
</style>