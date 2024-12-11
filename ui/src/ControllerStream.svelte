<script lang="ts">
  import { ZipTestStore } from "./store";
  import { onMount, setContext } from "svelte";
  import {
    encodeHashToBase64,
    decodeHashFromBase64,
    type AppClient,
    type EntryHash,
  } from "@holochain/client";
  import type { Profile, ProfilesStore } from "@holochain-open-dev/profiles";
  import type { WeaveClient } from "@theweave/api";
  import StreamPane from "./StreamPane.svelte";
  import type { EntryRecord } from "@holochain-open-dev/utils";

  export let roleName = "";
  export let client: AppClient;
  export let profilesStore: ProfilesStore;
  export let weaveClient: WeaveClient;
  export let streamId: string;

  $: allProfiles = store.profilesStore.allProfiles;

  $: liveStreams = store.streams;

  let store: ZipTestStore = new ZipTestStore(
    weaveClient,
    profilesStore,
    client,
    roleName
  );

  setContext("store", {
    getStore: () => store,
  });

  const getAllStreamProfiles = (
    allProfiles: ReadonlyMap<Uint8Array, EntryRecord<Profile>>
  ) => {
    const profiles = Array.from(allProfiles.entries()).filter(
      ([agent, p]) => encodeHashToBase64(agent) != store.myAgentPubKeyB64
    );
    return profiles;
  };

  const hashes = (streamProfiles:[Uint8Array, EntryRecord<Profile>][]) => {
    if (streamId === "_all") {
      return streamProfiles.map(([k,_])=>k);
    } else {
      return JSON.parse(streamId)
        .filter((a) => a != store.myAgentPubKeyB64)
        .map((a) => decodeHashFromBase64(a));
    }
  };

  const getNickname = (streamProfiles: [Uint8Array, EntryRecord<Profile>][], aB64: string) => {
    if (streamProfiles) {
      const idx = streamProfiles.findIndex(
        ([h, _]) => h && encodeHashToBase64(h) == aB64
      );
      if (idx >= 0) {
        return streamProfiles[idx][1].entry.nickname;
      }
    }
    return "unknown";
  };

  onMount(() => {
    if (!$liveStreams[streamId]) {
      store.newStream(streamId);
    }
  });
</script>

<div class="flex-scrollable-parent">
  <div class="flex-scrollable-container">
    <div class="app">
      <div class="main-pane">
        {#if store && $liveStreams[streamId] && $allProfiles.status === "complete"}
          {@const streamProfiles = getAllStreamProfiles($allProfiles.value)}
          {@const allAgentKeys = hashes(streamProfiles)} 
          {#if streamId !== "_all" && Array.from($allProfiles.value.keys()).findIndex(k=>encodeHashToBase64(k) === store.myAgentPubKeyB64) == -1}
            <p style="margin:auto">This stream doesn't include you!</p>
          {:else}
            <div class="whom">
              {#if streamId === "_all"}
                Everybody
              {:else}
                {#each allAgentKeys as key}
                  {@const aB64 = encodeHashToBase64(key)}
                  <agent-avatar
                    class:disable-ptr-events={true}
                    disable-tooltip={true}
                    disable-copy={true}
                    size={20}
                    agent-pub-key={aB64}
                  ></agent-avatar>
                  <span style="margin-left:5px"
                    >{getNickname(streamProfiles, aB64)}</span
                  >
                {/each}
              {/if}
            </div>
            <div class="stream">
              <StreamPane
                standalone={true}
                stream={$liveStreams[streamId]}
                hashes={allAgentKeys}
              />
            </div>
          {/if}
        {:else}
          <div class="loading"><div class="loader" /></div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .app {
    margin: 0;
    padding-bottom: 10px;
    background-image: var(--bg-img, url(""));
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100vh;
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
  .stream {
    display: flex;
    width: 100%;
    height: 100%;
  }
  .main-pane {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
  .whom {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: lightgoldenrodyellow;
  }
</style>
