<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import { getContext } from "svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import type { ZipTestStore } from "./store";
  import { ThingStore } from "./thingStore";

  const { getStore }: any = getContext("store");
  const store: ZipTestStore = getStore();

  const thingStore: ThingStore = new ThingStore(store.client)

  $: things = thingStore.thingLinks

  const createThing = async () => {
    let count = parseInt(inputCountElement.value)
    let delay = parseInt(inputDelayElement.value)
    setTimeout(() => {
      _createThing(inputCountElement.value)
      count-=1
      inputCountElement.value = `${count}`
      if (count>0) {
        createThing()
      }
    }, delay);
  }
  const _createThing = async (text) => {
    await store.client.createThing(text);
  };

  let inputCountElement
  let inputDelayElement
  let disabled = false


</script>
  {#if $things.status == "complete" }
    <div class="wrapper">
      <div class="send-controls">
        <sl-input
          style="width:60px"
          value=1
          bind:this={inputCountElement}
          label="Count"
        ></sl-input>
        <sl-input
          style="width:60px"
          value={500}
          bind:this={inputDelayElement}
          label="Delay"
        ></sl-input>
    
        <sl-button
          style="margin-left:10px;"
          circle
          {disabled}
          on:click={()=>createThing()}
          ><SvgIcon icon="ziptest" size="20" />
        </sl-button>
      </div>
      <div class="header">
        Thing Count: {$things.value.length}
      </div>
    </div>
  {/if}


<style>
  .wrapper {
    padding-left: 10px;
    display: flex;
    flex-direction: column;
  
    width: 100%;
  }
  .things {
    width: 100%;
    display: flex;
    flex: auto;
    flex-direction: column;
    overflow-y: auto;
    height: 500px;
  }
  .thing {
    position: relative;
    display: flex;
    margin: 5px;
    flex-shrink: 1;
    align-self: flex-start;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .send-controls {
    display: flex;
    justify-content: flex-end;
    padding: 5px;
  }
</style>
