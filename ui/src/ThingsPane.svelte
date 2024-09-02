<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import { getContext, onDestroy, onMount } from "svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import type { ZipTestStore } from "./store";
  import { ThingStore } from "./thingStore";
  import { get } from "svelte/store";
  import Bunch from "./Bunch.svelte";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";

  const { getStore }: any = getContext("store");
  const store: ZipTestStore = getStore();

  let bunches

  let bunch: string = ""

  let interval
  onMount(()=>{
    interval = setInterval(async () => {
        const b = await store.client.getThings("bunches")
        if (!bunches || b.length != bunches.length) {
          bunches = b
        }
    }, 3000);
  })
  onDestroy(()=>{
    if (interval) {
        clearInterval(interval)
    }
  })
  
  const createBunch = async () => {
    const profile = get(store.profilesStore.myProfile)
    const name = (profile.status=="complete") ? profile.value.entry.nickname : "unknown"
    bunch = `${name}.${new Date().getTime()}`
    inputElement.value = bunch
    let reps = parseInt(inputRepsElement.value);
    let count = parseInt(inputCountElement.value);
    let delay = parseInt(inputDelayElement.value);
    await store.client.createThing("bunches",undefined, JSON.stringify({reps,count,delay}), bunch);
    await createThings()
  };

  const createThings = async () => {
    let count = parseInt(inputCountElement.value);
    let reps = parseInt(inputRepsElement.value);
    let delay = parseInt(inputDelayElement.value);
    setTimeout(() => {
      _createThing(inputCountElement.value,reps);
      count -= 1;
      inputCountElement.value = `${count}`;
      if (count > 0) {
        createThings();
      }
    }, delay);
  };
  const _createThing = async (text, reps) => {
    await store.client.createThing(bunch, reps, text, undefined);
  };

  function tag2Bunch(array) {
  var result = "";
  for (var i = 0; i < array.length; i++) {
    result += String.fromCharCode(array[i]);
  }
  return result;
}

  const bunch2BunchName = (bunch) => {
    return `${new Date(parseInt(bunch.split(".")[1]))}`
  }

  let inputElement;
  let inputRepsElement;
  let inputCountElement;
  let inputDelayElement;
  let disabled = false;
  let activeBunch = ""
</script>

  <div class="wrapper">
    <div class="send-controls">
      <sl-input
        style="width:60px"
        value="1"
        bind:this={inputRepsElement}
        label="Reps"
      ></sl-input>
      <sl-input
        style="width:60px"
        value="1"
        bind:this={inputCountElement}
        label="Count"
      ></sl-input>
      <sl-input
        style="width:60px"
        value={500}
        bind:this={inputDelayElement}
        label="Delay"
      ></sl-input>
      <sl-input
        style="width:300px"
        bind:this={inputElement}
        on:sl-input={(e) => (disabled = !e.target.value || !inputElement.value)}
        label="Message"
      ></sl-input>

      <sl-button
        style="margin-left:10px;"
        circle
        {disabled}
        on:click={() => createBunch()}
        ><SvgIcon icon="ziptest" size="20" />
      </sl-button>
    </div>
    <div class="header">
      Bunches Count: {bunches ? bunches.length: "?"}
    </div>

    {#if !bunches}
    <sl-skeleton effect="pulse" style="height: 10px; width: 100px;"></sl-skeleton>
    {:else}
    
    <div class="bunches">
      {#each bunches as link}
      {@const bunch = tag2Bunch(link.tag)}
      <div on:click={()=>{
        if (bunch != activeBunch) {
          activeBunch = bunch
        }
        else {
          activeBunch = ''
        }
        }}>{bunch2BunchName(bunch)}</div>
        {#if bunch == activeBunch}
          <Bunch bunchHash={link.target} bunch={bunch}></Bunch>
        {/if}
      {/each}
    </div>
    {/if}
  </div>

<style>
  .wrapper {
    padding-left: 10px;
    display: flex;
    flex-direction: column;

    width: 100%;
  }
  .bunches {
    width: 100%;
    display: flex;
    flex: auto;
    flex-direction: column;
    overflow-y: auto;
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
