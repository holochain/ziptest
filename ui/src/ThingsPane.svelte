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

  let bunches;

  let bunch: string = "";

  let interval;
  let activateBunch;
  onMount(() => {
    interval = setInterval(async () => {
      const b = await store.client.getThings("bunches");
      if (!bunches || b.length != bunches.length) {
        bunches = b;
        if (activateBunch) {
          bunches.forEach((l) => {
            if (tag2Bunch(l.tag) == activateBunch) {
              activeBunch = activateBunch;
              activateBunch = "";
            }
          });
        }
      }
    }, 3000);
  });
  onDestroy(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  const createBunch = async () => {
    const profile = get(store.profilesStore.myProfile);
    const name =
      profile.status == "complete" ? profile.value.entry.nickname : "unknown";
    bunch = `${name}.${new Date().getTime()}`;
    let reps = parseInt(inputRepsElement.value);
    let count = parseInt(inputCountElement.value);
    let delay = parseInt(inputDelayElement.value);
    await store.client.createThing(
      "bunches",
      undefined,
      JSON.stringify({ reps, count, delay }),
      bunch
    );
    activateBunch = bunch;
  };

  function tag2Bunch(array) {
    var result = "";
    for (var i = 0; i < array.length; i++) {
      result += String.fromCharCode(array[i]);
    }
    return result;
  }

  const bunch2BunchName = (bunch) => {
    const [agent, timestamp] = bunch.split(".")
    const date = new Date(parseInt(timestamp))
    return `${agent}:${date.toISOString()}`;
  };

  const bunchHash = (bunch) => {
    console.log("FISH", activeBunch);
    console.log(
      "FISH2",
      bunches.map((l) => tag2Bunch(l.tag))
    );
    const link = bunches.find((link) => tag2Bunch(link.tag) == bunch);
    console.log("FISH3", link);
    return link.target;
  };

  let inputRepsElement;
  let inputCountElement;
  let inputDelayElement;
  let disabled = false;
  let activeBunch = "";
</script>

<div class="wrapper">
  <div class="left-column">
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

      <sl-button
        style="margin-left:10px;"
        {disabled}
        on:click={() => createBunch()}
        >New Bunch
      </sl-button>
    </div>
    <div class="header">
      Bunches Count: {bunches ? bunches.length : "?"}
    </div>

    {#if !bunches}
      <sl-skeleton effect="pulse" style="height: 10px; width: 100px;"
      ></sl-skeleton>
    {:else}
      <div class="bunches">
        {#each bunches as link}
          {@const bunch = tag2Bunch(link.tag)}
          <div
            class="bunch-item"
            class:selected={bunch==activeBunch}
            on:click={() => {
              if (bunch != activeBunch) {
                activeBunch = bunch;
              } else {
                activeBunch = "";
              }
            }}
          >
            {bunch2BunchName(bunch)}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  {#if activeBunch}
    <div class="bunch">
      <h3>{bunch2BunchName(activeBunch)}</h3>
      {#key activeBunch}
        <Bunch bunchHash={bunchHash(activeBunch)} bunch={activeBunch}></Bunch>
      {/key}
    </div>
  {/if}
</div>

<style>
  .wrapper {
    display: flex;
  }
  .left-column {
    padding-left: 10px;
    display: flex;
    flex-direction: column;

  }
  .bunches {
    display: flex;
    flex: auto;
    flex-direction: column;
    overflow-y: auto;
  }
  .selected {
    font-weight: bold;
  }
  .bunch-item {
    cursor: pointer;
  }
  .bunch {
    width: 850px;
    margin-left: 10px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .send-controls {
    display: flex;
    padding: 5px;
  }
</style>
