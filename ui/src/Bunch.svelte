<script lang="ts">
  import { createEventDispatcher, getContext, onDestroy, onMount } from "svelte";
  import type { ZipTestStore } from "./store";
  import type { EntryHash } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";

  const dispatch = createEventDispatcher();
  const { getStore }: any = getContext("store");
  let store: ZipTestStore = getStore();

  export let bunchHash: EntryHash;
  export let bunch: string;

    type Moment = {
        count: number,
        date: Date,
    }

  let bunchRecord
  let bunchContent

  const GRAPH_HEIGHT = 200
  let start
  let unit = 10
  let expected = 0
  let moments = []
  let allFound = false
  let seconds = 0

  let interval
  onMount(async ()=>{
    bunchRecord = await store.client.getThing(bunchHash)
    bunchContent = JSON.parse(bunchRecord.entry.content)
    start = new Date
    expected = bunchContent.count*bunchContent.reps
    unit = GRAPH_HEIGHT/expected
    interval = setInterval(async () => {
        const things = await store.client.getThings(bunch)
        const count  = things.length
        moments.push(count)
        moments = moments
        if (expected == count) {
            allFound=true
            clearInterval(interval)
            interval = undefined
        }
        seconds +=1 
    }, 1000);
  })
  onDestroy(()=>{
    if (interval) {
        clearInterval(interval)
    }
  })
</script>

<div class="wrapper">
  {#if bunchRecord}
    <div class="bunch-content">
        {#if allFound}
            All {expected} things found after {seconds} seconds.
        {:else}
            Seconds elapsed: : {seconds}
        {/if}
      <div>
        Start: {start}
      </div>
      <div class="graph">
        <div class="units" style={`height:${GRAPH_HEIGHT+40}px`}><span>{expected}</span></div>
        {#each moments as moment,i}
            <div style="display:flex;flex-direction:column;align-items:center">
                <span style="font-size:80%;padding-left:3px;padding-right:3px">{moment}</span>
                <div title={moment} class="bar" style={`height:${moment*unit}px;width:5px`}></div>
                <span style="font-size:80%;padding-left:3px;padding-right:3px">{i}</span>

            </div>
        {/each}
        <div class="units" style={`height:${GRAPH_HEIGHT+40}px`}><span>{expected}</span></div>
        </div>
    </div>
  {:else}
    <sl-skeleton effect="pulse" style="height: 10px; width: 100%"></sl-skeleton>
  {/if}
</div>

<style>
  .graph{
    display: flex;
    align-items: end;
  }
  .bar {
    background-color: red;
    justify-content: flex-end;
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
