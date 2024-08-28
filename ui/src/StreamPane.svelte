<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import { createEventDispatcher, getContext, onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import SvgIcon from "./SvgIcon.svelte";
  import Confirm from "./Confirm.svelte";
  import { isWeContext, type WAL } from "@lightningrodlabs/we-applet";
  import type { ZipTestStore } from "./store";
  import { encodeHashToBase64 } from "@holochain/client";
  import type { Stream, Payload, Message } from "./stream";
  import type { AgentPubKey } from "@holochain/client";
  import { HoloHashMap } from "@holochain-open-dev/utils";
	import { debounce } from 'lodash-es';

  const { getStore }: any = getContext("store");
  const store: ZipTestStore = getStore();

  export let hashes: Array<AgentPubKey>;
  export let stream: Stream;
  export let standalone = false;

  const showFrom = stream.id == "_all" || JSON.parse(stream.id).length > 2;
  const dispatch = createEventDispatcher();

  const walToPocket = () => {
    const nullHash = new Uint8Array(39)
    const attachment: WAL = { hrl: [store.dnaHash, nullHash], context: stream.id }
    store.weaveClient?.walToPocket(attachment)
  }
  const SCROLL_THRESHOLD = 100; // How close to the bottom must the user be to consider it "at the bottom"

  type Results = {
    count: number,
    acks: number
  }

  //@ts-ignore
  $: myProfile = get(store.profilesStore.myProfile).value;

  onMount(async () => {
    conversationContainer.addEventListener('scroll', handleScroll);
  });
  onDestroy(() => {
    conversationContainer.removeEventListener('scroll', handleScroll);
  })

  const getSources = (messages:Message[],acks: {[key: number]:HoloHashMap<AgentPubKey,boolean>}) => {
    const sources:HoloHashMap<AgentPubKey, Results> = new HoloHashMap()

    messages.forEach((m)=>{
      const fromB6 = encodeHashToBase64(m.from)
      const r = sources.get(m.from)
      const results:Results = r ? r: {count:1, acks:0}
      if (r) {
        results.count+= 1
      }
      if (fromB6 == store.myAgentPubKeyB64) {
        results.acks += getAckCount(acks, m.payload.created)
      }
      sources.set(m.from, results)
    })
    return sources
  }

  $: messages = stream.messages;
  $: acks = stream.acks;
  $: sources = getSources($messages,$acks)
  $: lastSeen = store.lastSeen;
  $: agentActive = store.agentActive;

  let inputElement;
  let inputCountElement;
  let inputDelayElement
  let disabled;
  const sendMessage = async () => {
    let count = parseInt(inputCountElement.value)
    let delay = parseInt(inputDelayElement.value)
    setTimeout(() => {
      _sendMessage(inputCountElement.value)
      count-=1
      inputCountElement.value = `${count}`
      if (count>0) {
        sendMessage()
      }
    }, delay);
  }
  const _sendMessage = async (text) => {
    const payload: Payload = {
      type: "Msg",
      text,
      created: Date.now(),
    }
    console.log("SENDING TO",hashes)
    await store.sendMessage(stream.id, payload, hashes);
    inputElement.value = "";
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
  const convertMessageText = (text: string): string => {
    let formatted = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a style="text-decoration: underline;" href="$1">$1</a>'
    );
    formatted = formatted.replace(
      /(we:\/\/[^\s]+)/g,
      '<a style="text-decoration: underline;" href="$1">$1</a>'
    );
    return formatted;
  };

  let conversationContainer: HTMLElement;

  let scrollAtBottom = true
    // Reactive update to scroll to the bottom every time the messages update,
  // but only if the user is near the bottom already
  $: if ($messages && $messages.length > 0) {
    if (scrollAtBottom) {
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleScroll = debounce(() => {
    scrollAtBottom = conversationContainer.scrollHeight - conversationContainer.scrollTop <= conversationContainer.clientHeight + SCROLL_THRESHOLD;
  }, 100)

  function scrollToBottom() {
    if (conversationContainer) {
      conversationContainer.scrollTop = conversationContainer.scrollHeight;
      scrollAtBottom = true
    }
  }

  let showRecipients = 0
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
      <span>Total Messages: {$messages.length}</span>
      {#each Array.from(sources.entries()) as [key,results]}
      {@const key64 = encodeHashToBase64(key)}
      <div style="display:flex">
        <agent-avatar
                    style="margin-right: 2px; margin-bottom: 2px;"
                    size={18}
                    agent-pub-key={key64}
                  ></agent-avatar>
        {results.count} {#if key64 == store.myAgentPubKeyB64} acks: {results.acks} {/if}
      </div>
    {/each}
    </div>
    <div style="display:flex; align-items: center">
      {#if isWeContext()}
        <sl-button
          on:click={()=>walToPocket() }
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
  <div class="stream" bind:this={conversationContainer}>

    {#each $messages as msg}
      {@const isMyMessage =
        encodeHashToBase64(msg.from) == store.myAgentPubKeyB64}
      <div class="msg" class:my-msg={isMyMessage}>
        {#if msg.payload.type == "Msg"}
          {#if !isMyMessage && showFrom}
            <agent-avatar
              style="margin-right:5px"
              disable-copy={true}
              size={20}
              agent-pub-key={encodeHashToBase64(msg.from)}
            ></agent-avatar>
          {/if}
          {@html convertMessageText(msg.payload.text)}
          <span
            title={`Received: ${new Date(msg.received).toLocaleTimeString()}`}
            class="msg-timestamp"
            >{new Date(msg.payload.created).toLocaleTimeString()}</span
          >
          {#if isMyMessage}
            {@const ackCount = getAckCount($acks, msg.payload.created)}
            {#if ackCount == hashes.length}
              ✓
            {:else if hashes.length > 1}
              <span class="ack-count"
              on:mouseover={() => {
                if (showRecipients !== msg.payload.created) {
                  showRecipients = msg.payload.created;
                }
              }}
              >{ackCount}</span>
              <div
        on:mouseleave={() => {
          showRecipients = 0;
        }}
      >
      {#if showRecipients === msg.payload.created}
        {@const keys = Array.from($acks[msg.payload.created].keys())}
        <div class="msg-recipients">
          <div class="msg-recipients-title" style="margin-bottom: 2px;">{'received by:'}</div>
          <div style="display:flex;flex-direction:row; flex-wrap: wrap;">
            {#each keys as agent, i}
                <agent-avatar
                  style="margin-left: 2px; margin-bottom: 2px;"
                  size={18}
                  agent-pub-key={encodeHashToBase64(agent)}
                ></agent-avatar>{#if i<keys.length-1},{/if}
            {/each}
          </div>
        </div>
      {/if}
      </div>
            {/if}
          {/if}
        {/if}
      </div>
    {/each}
  </div>
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
    <sl-input
      style="width:300px"
      bind:this={inputElement}
      on:sl-input={(e) => (disabled = !e.target.value || !inputElement.value)}
      on:keydown={(e) => {
        if (e.keyCode == 13) {
          _sendMessage(inputElement.value);
          e.stopPropagation();
        }
      }}
      label="Message"
    ></sl-input>

    <sl-button
      style="margin-left:10px;"
      circle
      {disabled}
      on:click={sendMessage}
      ><SvgIcon icon="ziptest" size="20" />
    </sl-button>
  </div>
</div>

<style>
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
  .stream {
    width: 100%;
    display: flex;
    flex: auto;
    flex-direction: column;
    overflow-y: auto;
    height: 0px;
  }
  .msg {
    position: relative;
    display: flex;
    margin: 5px;
    border-radius: 0px 15px 0px 15px;
    color: white;
    padding: 3px 10px;
    flex-shrink: 1;
    align-self: flex-start;
    background-color: rebeccapurple;
  }
  a {
    text-decoration: underline;
  }
  .my-msg {
    border-radius: 15px 0px 15px 0px;
    align-self: flex-end;
    background-color: blue;
  }
  .send-controls {
    display: flex;
    justify-content: flex-end;
    padding: 5px;
  }
  .msg-timestamp {
    margin-left: 4px;
    font-size: 80%;
    color: #ccc;
  }
  .ack-count {
    display: flex;
    justify-content: center;
    margin: auto;
    width: 15px;
    height: 15px;
    margin-left: 5px;
    background-color: yellow;
    color: black;
    font-size: 80%;
    border-radius: 50%;
  }
  .person-inactive {
    opacity: 0.5;
  }
  .msg-recipients {
    z-index: 1;
    align-items: flex-end;
    position: absolute;
    top: 2px;
    right: 14px;
    background-color: #f3ff3b;
    margin-top: 5px;
    padding: 5px;
    color: white;
    border-radius: 8px;
    max-width: 220px;
  }
  .msg-recipients-title {
    font-size: 10px;
    color: #08230e;
    cursor: default;
  }
</style>
