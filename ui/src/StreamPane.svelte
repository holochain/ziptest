<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
  } from "svelte";
  import { get } from "svelte/store";
  import SvgIcon from "./SvgIcon.svelte";
  import Confirm from "./Confirm.svelte";
  import { isWeContext, type WAL } from "@lightningrodlabs/we-applet";
  import type { ZipTestStore } from "./store";
  import { encodeHashToBase64 } from "@holochain/client";
  import type { Stream, Payload, Message } from "./stream";
  import type { AgentPubKey } from "@holochain/client";
  import { HoloHashMap } from "@holochain-open-dev/utils";
  import { hashEqual } from "./util";

  const { getStore }: any = getContext("store");
  const store: ZipTestStore = getStore();

  export let hashes: Array<AgentPubKey>;
  export let stream: Stream;
  export let standalone = false;

  const showFrom = stream.id == "_all" || JSON.parse(stream.id).length > 2;
  const dispatch = createEventDispatcher();

  const walToPocket = () => {
    const nullHash = new Uint8Array(39);
    const attachment: WAL = {
      hrl: [store.dnaHash, nullHash],
      context: stream.id,
    };
    store.weaveClient?.walToPocket(attachment);
  };

  type Results = {
    from: AgentPubKey;
    expected: number;
    delay: number;
    count: number;
    acks: number;
    agents: number;
    graph: number[];
  };

  //@ts-ignore
  $: myProfile = get(store.profilesStore.myProfile).value;

  onMount(async () => {
  });
  onDestroy(() => {
  });

  let inputSecondsElement;

  const getSources = (
    messages: Message[],
    acks: { [key: number]: HoloHashMap<AgentPubKey, boolean> }
  ) => {
    const sources: { [key: string]: Results } = {};

    const seconds = inputSecondsElement ? parseInt(inputSecondsElement.value?inputSecondsElement.value : 60) : 60

    messages.forEach((m) => {
      if (m.payload.type == "Msg") {
        const iAmSender = hashEqual(m.from, store.myAgentPubKey)
        const [test, delay, expected, count, agents] = m.payload.text.split(".");
        const r = sources[test];
        const countInt = parseInt(count)
        const delayInt = parseInt(delay)
        const expectedInt = parseInt(expected)
        const agentsInt = parseInt(agents)
        const results: Results = r
          ? r
          : { expected: iAmSender ? expectedInt*agentsInt : expectedInt ,delay:delayInt,count: 1, acks: 0, from: m.from, agents:agentsInt, graph:[] };
        if (r) {
          results.count += iAmSender ? agentsInt : 1;
        }
        if (iAmSender) {
          results.acks += getAckCount(acks, m.payload.created);
        }
        const signalAt = countInt*delayInt
        const index = Math.trunc(signalAt/(1000*seconds))
        results.graph[index] = !results.graph[index] ? 1 : results.graph[index]+1
        sources[test] = results;
      }
    });
    return sources;
  };

  $: messages = stream.messages;
  $: acks = stream.acks;
  $: sources = getSources($messages, $acks);
  $: lastSeen = store.lastSeen;
  $: agentActive = store.agentActive;

  let currentTest;
  let currentTestExpected;
  let currentTestCount;
  let currentTestDelay;

  let inputCountElement;
  let inputDelayElement;
  let disabled;
  const startTest = async () => {
    const now = new Date();
    currentTest = `${now.getTime()}`;
    currentTestExpected = parseInt(inputCountElement.value);
    currentTestDelay = parseInt(inputDelayElement.value);
    currentTestCount = 0
    await sendMessage();
  };
  const sendMessage = async () => {
    setTimeout(() => {
      if (currentTest) {
        _sendMessage();
        currentTestCount+=1;
        if (currentTestCount < currentTestExpected && currentTest) {
          sendMessage();
        } else {
          currentTest = ""
        }
      }
    }, currentTestDelay);
  };
  const _sendMessage = async () => {
    const payload: Payload = {
      type: "Msg",
      text: `${currentTest}.${currentTestDelay}.${currentTestExpected}.${currentTestCount}.${hashes.length}`,
      created: Date.now(),
    };
    console.log("SENDING TO", hashes);
    await store.sendMessage(stream.id, payload, hashes);
  };
  const getAckCount = (
    acks: { [key: number]: HoloHashMap<Uint8Array, boolean> },
    msgId
  ): number => {
    const ack = acks[msgId];
    if (ack) {
      return ack.size;
    }
    return 0;
  };
  let confirmDialog;
 

  let showRecipients = 0;
</script>

<Confirm
  bind:this={confirmDialog}
  message="Zap this stream?"
  on:confirm-confirmed={() => {
    dispatch("zap");
  }}
></Confirm>
<div class="person-feed">
  <div class="header">
    <div>
      <div class="send-controls">
        {#if !currentTest}
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
      
          <sl-button style="margin-left:10px;"  on:click={startTest}
            >Start Test
          </sl-button>
        {:else}
        Current Count: {currentTestCount} of {currentTestExpected} (delay {currentTestDelay})
          <sl-button style="margin-left:10px;" disabled={!currentTest} on:click={()=>currentTest=""}
            >Cancel Test
          </sl-button>
        {/if}
          
      </div>
      Graph Unit (seconds)
      <sl-input
            style="width:60px"
            value={60}
            bind:this={inputSecondsElement}
          ></sl-input> 
      {#each Object.entries(sources).reverse() as [test, results]}
        <div style="display:flex">
          <agent-avatar
            style="margin-right: 2px; margin-bottom: 2px;"
            size={18}
            agent-pub-key={encodeHashToBase64(results.from)}
          ></agent-avatar>
          <span style="padding-left:5px;padding-right:5px;">{(new Date(parseInt(test)) ).toISOString()} (delay {results.delay}): </span>

          {#if hashEqual(results.from, store.myAgentPubKey)}
            {results.count} of {results.expected} sent with {results.acks} acks ({(
              (results.acks / results.count) *
              100
            ).toFixed(0)}%)
          {:else}
            {results.count} of {results.expected} received ({(
              (results.count / results.expected) *
              100
            ).toFixed(0)}%)
          {/if}
        </div>
        <div class="graph">
          {#each results.graph as count}
            <div  class="bar" style={`height:${count*5}px; ;width:4px`}> </div>
          {/each}
        </div>
      {/each}
    </div>
    <div style="display:flex; align-items: center">
      {#if isWeContext()}
        <sl-button
          on:click={() => walToPocket()}
          style="margin-top: 5px;margin-right: 5px"
          title="Add to Pocket"
          circle
          size="small"><SvgIcon icon="addToPocket" size="20" /></sl-button
        >
      {/if}
      {#if !standalone}
        <sl-button
          on:click={() => confirmDialog.open()}
          style="margin-top: 5px;margin-right: 5px"
          title="Zap"
          circle
          size="small"><SvgIcon icon="faClose" size="10" /></sl-button
        >
      {/if}

      <!-- {#each hashes as hash}
        {@const hb64 = encodeHashToBase64(hash)}
        <div style="margin-right:5px;margin-top:5px;"  class:person-inactive={!$agentActive || !$agentActive.get(hash)} title={`Last Seen: ${ $lastSeen.get(hash) ? new Date($lastSeen.get(hash)).toLocaleTimeString(): "never"}`} >
          <agent-avatar  disable-copy={true} size={20} agent-pub-key="{hb64}"></agent-avatar>
        </div>
      {/each} -->
    </div>
  </div>


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
  .person-feed {
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    background-color: lightgoldenrodyellow;
    width: 100%;
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
