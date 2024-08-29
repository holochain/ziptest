<script lang="ts">
  import { ZipTestStore } from "./store";
  import { onMount, setContext } from "svelte";
  import type { AppClient, EntryHash } from "@holochain/client";
  import type { Profile, ProfilesStore } from "@holochain-open-dev/profiles";
  import SvgIcon from "./SvgIcon.svelte";
  import Avatar from "./Avatar.svelte";
  import StreamPane from "./StreamPane.svelte";
  import ThingsPane from "./ThingsPane.svelte";
  import ThingItem from "./ThingItem.svelte";
  import type { WeaveClient } from "@lightningrodlabs/we-applet";
  import { decodeHashFromBase64, encodeHashToBase64 } from "@holochain/client";
  import type { AgentPubKey } from "@holochain/client";
  import { EntryRecord, HoloHashMap } from "@holochain-open-dev/utils";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import AboutDialog from "./AboutDialog.svelte";
  import { time } from "./util";
  import { allRevisionsOfEntryStore } from "@holochain-open-dev/stores";

  export let roleName = "";
  export let client: AppClient;
  export let profilesStore: ProfilesStore;
  export let weaveClient: WeaveClient;

  let aboutDialog;

  type StreamDef = {
    hashes: Array<AgentPubKey>;
    lastSeenActivity: number;
  };

  let store: ZipTestStore = new ZipTestStore(
    weaveClient,
    profilesStore,
    client,
    roleName
  );

  setContext("store", {
    getStore: () => store,
  });

  let interval;
  const setupPing = (
    allProfiles: ReadonlyMap<Uint8Array, EntryRecord<Profile>>
  ) => {
    if (interval) {
      clearInterval(interval);
    }
    const people = Array.from(allProfiles.entries()).filter(
      ([agent, p]) => encodeHashToBase64(agent) != store.myAgentPubKeyB64
    );
    const agents = people.map(([agent, p]) => agent);
    store.client.sendMessage(
      "_all",
      { type: "Ping", created: Date.now() },
      agents
    );
    interval = setInterval(() => {
      store.client.sendMessage(
        "_all",
        { type: "Ping", created: Date.now() },
        agents
      );
    }, 30000);
    return people;
  };
  window.addEventListener("beforeunload", function (e) {
    clearInterval(interval);
  });

  $: myAgentPubKeyB64 = store.myAgentPubKeyB64;
  $: myProfile = store.profilesStore.myProfile;
  $: allProfiles = store.profilesStore.allProfiles;
  $: allPeople =
    $allProfiles.status === "complete" ? setupPing($allProfiles.value) : [];
  let unseen: HoloHashMap<AgentPubKey, number> = new HoloHashMap();
  $: lastSeen = store.lastSeen;
  $: lastActivity = store.lastActivity;
  $: agentActive = store.agentActive;
  let streams: { [key: string]: StreamDef } = {};
  let currentStream: string | undefined = undefined;
  $: liveStreams = store.streams;

  $: timer = time;

  let fileinput;
  const onFileSelected = (e) => {
    let file = e.target.files[0];
    let reader = new FileReader();

    reader.addEventListener(
      "load",
      async () => {
        const b = JSON.parse(reader.result as string);
        await store.makeThing(b);
      },
      false
    );
    reader.readAsText(file);
  };
</script>

<div class="flex-scrollable-parent">
  <div class="flex-scrollable-container">
    <div class="app">
      {#if store}
        <AboutDialog bind:this={aboutDialog} />
        <div style="display:flex; background-color: #eee;">
          <SvgIcon icon="ziptest"></SvgIcon>
          <div class="test-type" class:selected={currentStream=="_"} on:click={()=>currentStream="_"}><span style="font-weight:bold;font-size:110%">Things</span></div>
          <div class="test-type" class:selected={currentStream!="_"} on:click={()=>currentStream=""}><span style="font-weight:bold;font-size:110%">Streams</span></div>
        </div>

        <div class="main-pane">
          {#if currentStream!="_"}
            <div class="people flex-scrollable-y">
              <div
                class="person"
                class:selected={currentStream == "_all"}
                on:click={() => {
                  if (streams[currentStream])
                    streams[currentStream].lastSeenActivity =
                      $lastActivity[currentStream];
                  const hashes = allPeople
                    .map(([agent, _]) => agent)
                    .filter(
                      (agent) =>
                        encodeHashToBase64(agent) != store.myAgentPubKeyB64
                    );
                  currentStream = "_all";
                  streams[currentStream] = {
                    hashes,
                    lastSeenActivity: $lastActivity[currentStream],
                  };
                  if (!$liveStreams["_all"]) {
                    store.newStream("_all");
                  }
                  hashes.map((a) => unseen.set(a, $lastSeen.get(a)));
                  // if (currentStream) {
                  //   unseen.set(currentStream, $lastSeen.get(currentStream))
                  // }
                  // currentStream = hash
                  // unseen.set(hash, $lastSeen.get(hash))
                  unseen = unseen;
                }}
              >
                Everybody
                {#if currentStream != "_all" && (streams["_all"] ? streams["_all"].lastSeenActivity : 0) < $lastActivity["_all"]}
                  <span style="color:red;margin-left:5px">●</span>
                {/if}
              </div>
              {#each allPeople as [hash, profile]}
                {@const hb64 = encodeHashToBase64(hash)}
                {@const thisUserStreamId = JSON.stringify(
                  [hash]
                    .concat(store.myAgentPubKey)
                    .map((h) => encodeHashToBase64(h))
                    .sort()
                )}
                {@const selected =
                  currentStream == thisUserStreamId ||
                  (currentStream &&
                    !currentStream.startsWith("_") &&
                    JSON.parse(currentStream).includes(hb64))}
                {#if hb64 != myAgentPubKeyB64}
                  <div
                    class="person"
                    class:selected
                    on:click={(e) => {
                      e.stopPropagation();
                      if (streams[currentStream])
                        streams[currentStream].lastSeenActivity =
                          $lastActivity[currentStream];

                      let hashes = [hash];
                      let newStreamId = thisUserStreamId;
                      if (
                        e.shiftKey &&
                        currentStream &&
                        currentStream != "_all"
                      ) {
                        if (
                          !streams[currentStream].hashes.find(
                            (h) => encodeHashToBase64(h) == hb64
                          )
                        ) {
                          hashes = hashes.concat(streams[currentStream].hashes);
                        }
                        if (hashes.length == allPeople.length - 1) {
                          // all people also includes me so subtract 1
                          newStreamId = "_all";
                        } else {
                          newStreamId = JSON.stringify(
                            hashes
                              .concat(store.myAgentPubKey)
                              .map((h) => encodeHashToBase64(h))
                              .sort()
                          );
                        }
                      }

                      currentStream = newStreamId;
                      streams[currentStream] = {
                        hashes,
                        lastSeenActivity: $lastActivity[currentStream],
                      };
                      if (!$liveStreams[currentStream]) {
                        store.newStream(currentStream);
                      }
                    }}
                    title={`Last Seen: ${$lastSeen.get(hash) ? new Date($lastSeen.get(hash)).toLocaleTimeString() : "never"}`}
                  >
                    <div
                      class:person-inactive={!$agentActive ||
                        !$agentActive.get(hash)}
                    >
                      <agent-avatar
                        class:disable-ptr-events={true}
                        disable-tooltip={true}
                        disable-copy={true}
                        size={25}
                        agent-pub-key={hb64}
                      ></agent-avatar>
                    </div>
                    <span style="margin-left:5px">{profile.entry.nickname}</span>

                    {#if !selected && (streams[thisUserStreamId] ? streams[thisUserStreamId].lastSeenActivity : 0) < $lastActivity[thisUserStreamId]}
                      <span style="color:red;margin-left:5px">●</span>
                    {/if}
                  </div>
                {/if}
              {/each}
              <div
                style="width:100%;height:1px;border-top:solid 1px lightgrey"
              ></div>
              {#each Object.values($liveStreams) as stream}
                {#if stream.id != "_all" && $lastActivity[stream.id]}
                  {@const allStreamAgents = JSON.parse(stream.id)}
                  {@const streamAgents = allStreamAgents.filter(
                    (a) => a != store.myAgentPubKeyB64
                  )}
                  {@const selected = currentStream == stream.id}
                  {#if allStreamAgents.length == streamAgents.length}
                    <p style="margin:auto">This stream doesn't include you!</p>
                  {:else if streamAgents.length > 1}
                    <div
                      style="padding=5px;display:flex; flex-wrap:wrap; justify-content:end; padding:5px;"
                      on:click={(e) => {
                        e.stopPropagation();
                        if (streams[currentStream])
                          streams[currentStream].lastSeenActivity =
                            $lastActivity[currentStream];

                        currentStream = stream.id;
                        streams[stream.id] = {
                          hashes: streamAgents.map((a) =>
                            decodeHashFromBase64(a)
                          ),
                          lastSeenActivity: $lastActivity[currentStream],
                        };
                        currentStream = stream.id;
                      }}
                      class:selected
                    >
                      {#each streamAgents as aB64}
                        <agent-avatar
                          class:disable-ptr-events={true}
                          disable-tooltip={true}
                          disable-copy={true}
                          size={20}
                          agent-pub-key={aB64}
                        ></agent-avatar>
                      {/each}
                      {#if !selected && (streams[stream.id] ? streams[stream.id].lastSeenActivity : 0) < $lastActivity[stream.id]}
                        <span style="color:red;margin-left:5px">●</span>
                      {/if}
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          {/if}
          {#if currentStream == "_"} 
            <div class="entries">
              <ThingsPane></ThingsPane>
            </div>
          {:else}
            <div class="stream">
              {#each Object.entries(streams) as [streamId, { hashes }]}
                {#if currentStream == streamId && $liveStreams[streamId]}
                  <StreamPane
                    on:zap={() => {
                      store.zapStream(streamId);
                      if (currentStream == streamId) {
                        currentStream = undefined;
                        delete streams[streamId];
                      }
                    }}
                    stream={$liveStreams[streamId]}
                    {hashes}
                  />
                {/if}
              {/each}
            </div>
          {/if}
        </div>
        <div class="footer">
          <span><SvgIcon icon="ziptest"></SvgIcon></span>
          ZipTest
          <span on:click={() => aboutDialog.open()}
            ><SvgIcon icon="info"></SvgIcon></span
          >
        </div>
        <!-- <div class="welcome-text">
              <div style="display:flex; flex-direction:column">

                {#if $myProfile.status == "complete"}
                  {@const myName = $myProfile.value.entry.nickname}
                <div style="margin-bottom:10px">
                  <h3>Things:</h3>
                  {#if $thingHashes.status == "complete"}
                    {#each $thingHashes.value as hash}
                      <ThingItem 
                        on:create={ 
                          async (e) => {
                            console.log("CREATING")
                          }
                        }
                        on:settings={
                          (e) => {
                            console.log("SETTINGS")
                          }
                        }
                        thingHash={hash}>
                      </ThingItem>
        
                    {/each}
                  {:else if $thingHashes.status == "error"}
                    Error!: {$thingHashes.error}
                  {/if}
      
                </div>
                {/if}
                <div class="new-type">
                  <h3>New Thing:</h3>
                  <input
                    style="display:none"
                    type="file"
                    accept=".json"
                    on:change={(e) => onFileSelected(e)}
                    bind:this={fileinput}
                  />
                  <sl-button
                    on:click={() => newBoardDialog.open()}
                    style=""
                    title="New Thing"
                    >New <SvgIcon icon=faSquarePlus size="16" /></sl-button
                  >
                  <sl-button
                    on:click={() => {
                      fileinput.click();
                    }}
                    title="Import Game"
                    >Import <SvgIcon icon=faFileImport size="16" /></sl-button
                  >
                  
                </div>
              </div>
            </div> -->
      {:else}
        <div class="loading"><div class="loader" /></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .app {
    margin: 0;
    background-image: var(--bg-img, url(""));
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100vh;
  }
  .test-type {
    padding: 5px;
    cursor: pointer;
  }
  .test-type:hover, .selected {
    background-color: white;
  }
  .footer {
    border-top: 1px solid lightgray;
    padding-left: 10px;
    padding-top: 3px;
    padding-bottom: 3px;
  }
  :global(:root) {
    --resizeable-height: 200px;
    --tab-width: 60px;
  }

  @media (min-width: 640px) {
    .app {
      max-width: none;
    }
  }
  .welcome-text {
    display: flex;
    border-radius: 5px;
    border: 1px solid #222;
    margin: auto;
    margin-top: 50px;
    max-width: 650px;
    padding: 26px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    background-color: white;
  }
  .loading {
    text-align: center;
    padding-top: 100px;
  }
  .loader {
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 50px;
    height: 50px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
    display: inline-block;
  }
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .flex-scrollable-parent {
    position: relative;
    display: flex;
    flex: 1;
  }
  .flex-scrollable-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .flex-scrollable-x {
    max-width: 100%;
    overflow-x: auto;
  }
  .flex-scrollable-y {
    max-height: 100%;
    overflow-y: auto;
  }
  .main-pane {
    display: flex;
    flex: 1;
    flex-direction: row;
  }
  .people {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 50px);
    overflow-y: auto;
    min-width: 125px;
  }
  .person {
    display: flex;
    align-items: center;
    padding: 5px;
    cursor: pointer;
    user-select: none;
  }
  .person-inactive {
    opacity: 0.5;
  }
  .selected {
    background-color: lightgoldenrodyellow;
    border-right: none;
  }
  .stream {
    display: flex;
    width: 100%;
  }
</style>
