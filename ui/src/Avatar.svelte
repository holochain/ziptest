<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import { getContext } from "svelte";
  import type { ZipTestStore } from "./store";
  import SvgIcon from "./SvgIcon.svelte";
  import AboutDialog from "./AboutDialog.svelte";
  import { EntryRecord } from "@holochain-open-dev/utils";
  import { AsyncReadable } from "@holochain-open-dev/stores";
  import { Profile } from "@holochain-open-dev/profiles";

  const { getStore }: any = getContext("store");
  let store: ZipTestStore = getStore();

  export let agentPubKey: AgentPubKey;
  export let size = 32;
  export let namePosition = "row";
  export let showAvatar = true;
  export let showNickname = true;
  export let placeholder = false;
  export let disableAvatarPointerEvents = false;

  $: agentPubKey;
  $: agentPubKeyB64 = encodeHashToBase64(agentPubKey);
  $: profile = store.profilesStore.profiles.get(agentPubKey) as AsyncReadable<
    EntryRecord<Profile> | undefined
  >;
  $: nickname =
    $profile.status == "complete" && $profile.value
      ? $profile.value.entry.nickname
      : agentPubKeyB64.slice(5, 9) + "...";
</script>

<div class="avatar-{namePosition}" title={showNickname ? "" : nickname}>
  {#if $profile.status == "pending"}
    <sl-skeleton effect="pulse" style={`height: ${size}px; width: ${size}px;`}
    ></sl-skeleton>
  {:else if $profile.status == "complete"}
    {#if showAvatar}
      {#if placeholder && !$profile.value.entry.fields.avatar}
        <SvgIcon
          icon="faUser"
          size={`${size}`}
          style="margin-left:5px;margin-right:5px"
        />
      {:else}
        <agent-avatar
          class:disable-ptr-events={disableAvatarPointerEvents}
          disable-tooltip={true}
          disable-copy={true}
          {size}
          agent-pub-key={agentPubKeyB64}
        ></agent-avatar>
      {/if}
    {/if}
    {#if showNickname}
      <div class="nickname">{nickname}</div>
    {/if}
  {/if}
</div>

<style>
  .avatar-column {
    align-items: center;
    display: flex;
    flex-direction: column;
  }
  .avatar-row {
    display: inline-flex;
    flex-direction: row;
    justify-content: center;
    position: relative;
    height: 100%;
    align-items: center;
  }
  .avatar-row .nickname {
    margin-left: 0.5em;
  }
  .disable-ptr-events {
    pointer-events: none;
  }
</style>
