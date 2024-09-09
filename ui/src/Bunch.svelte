<script lang="ts">
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import type { ZipTestStore } from "./store";
  import type { encodeHashToBase64, EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import { init } from "svelte/internal";
  import { hashEqual } from "./util";

  const dispatch = createEventDispatcher();
  const { getStore }: any = getContext("store");
  let store: ZipTestStore = getStore();

  export let bunchHash: EntryHash;
  export let bunch: string;

  type Moment = {
    count: number;
    date: Date;
  };

  let creatingThings = false;
  let creatingCount = 0;

  const createThings = async () => {
    setTimeout(async () => {
      await store.client.createThing(
        bunch,
        bunchContent.reps,
        `${creatingCount}`,
        undefined
      );
      creatingCount += 1;
      if (creatingCount < bunchContent.count) {
        createThings();
      }
    }, bunchContent.delay);
  };

  let bunchRecord;
  let bunchContent;

  const GRAPH_HEIGHT = 200;
  let start;
  let unit = 10;
  let expected = 0;
  let moments = [];
  let allFound = false;
  let initialFound = undefined;
  let seconds = 0;

  let interval;

  const runGraph = () => {
    start = new Date();
    expected = bunchContent.count * bunchContent.reps;
    unit = GRAPH_HEIGHT / expected;
    interval = setInterval(async () => {
      const things = await store.client.getThings(bunch);
      const count = things.length;
      moments.unshift(count);
      moments = moments;
      if (expected == count) {
        allFound = true;
        clearInterval(interval);
        interval = undefined;
      }
      seconds += 1;
    }, 1000);
  };

  onMount(async () => {
    bunchRecord = await store.client.getThing(bunchHash);
    bunchContent = JSON.parse(bunchRecord.entry.content);
    const things = await store.client.getThings(bunch);
    if (things.length >0) {
      moments.unshift(things.length);
      moments = moments;
      initialFound = "found"
      expected = bunchContent.count * bunchContent.reps;
    } else {
      initialFound = "notFound"
    }
  });
  onDestroy(() => {
    if (interval) {
      clearInterval(interval);
    }
  });
</script>

<div class="wrapper">
  {#if bunchRecord}
    <div class="bunch-content">
      {#if initialFound === undefined}
        <sl-skeleton effect="pulse" style="height: 10px; width: 100%"></sl-skeleton>
      {:else if initialFound === "found"}
        Expected: {expected}; Total found: {moments[0]}
        {#if moments[0] < expected }
          <sl-button
          on:click={()=>{
            initialFound = ""
            runGraph()
          }}
          >Watch Test</sl-button>
        {/if}
      {:else if initialFound === "notFound"}
        <div>Reps: {bunchContent.reps}; Count: {bunchContent.count}; Delay: {bunchContent.delay}</div>
        {#if hashEqual(bunchRecord.action.author, store.myAgentPubKey)}
          <sl-button
            on:click={()=>{
              creatingThings = true
              initialFound = ""
              runGraph()
              createThings()
            }}
          >Start Test</sl-button>
        {:else}
          <sl-button
          on:click={()=>{
            initialFound = ""
            runGraph()
          }}
          >Watch Test</sl-button>
        {/if}
      {:else}
        {#if allFound}
          All {expected} entries found after {seconds} seconds.
        {:else}
          {#if creatingThings}
          <div>Create Count: {creatingCount}</div>
          {/if}
          <div>Seconds elapsed: {seconds}</div>
        {/if}
        <div>
          Start: {start}
        </div>
        <div class="graph">
          <div class="units" style={`height:${GRAPH_HEIGHT + 38}px`}>
            <span>{expected}</span>
          </div>
          {#each moments as moment, i}
            <div style="display:flex;flex-direction:column;align-items:center">
              <span class="bar-num">{moment}</span>
              <div
                title={moment}
                class="bar"
                style={`height:${moment * unit}px;width:5px`}
              ></div>
              <span class="bar-num">{moments.length - i}</span>
            </div>
          {/each}
          <div class="units" style={`height:${GRAPH_HEIGHT + 38}px`}>
            <span>{expected}</span>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <sl-skeleton effect="pulse" style="height: 10px; width: 100%"></sl-skeleton>
  {/if}
</div>

<style>
  .graph {
    display: flex;
    align-items: end;
    width: 800px;
    overflow-x: scroll;
  }
  .bar {
    background-color: red;
    justify-content: flex-end;
  }
  .bar-num {
    font-size: 70%;
    padding-left: 2px;
    padding-right: 2px;
  }
  .units {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: right;
  }
  .wrapper {
    padding-left: 10px;
    width: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .bunch-content {
    font-size: 16px;
    font-weight: bold;
    margin-right: 10px;
  }
</style>
