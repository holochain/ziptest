<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import AvatarDialog from './AvatarDialog.svelte';
    import { getContext, onMount } from "svelte";
    import Avatar from './Avatar.svelte';
    import { get } from 'svelte/store';    
    import SvgIcon from "./SvgIcon.svelte";
    import { isWeaveContext } from '@theweave/api';
    import type { ZipTestStore } from "./store";

    const { getStore } :any = getContext('store');
    const store:ZipTestStore = getStore();
     //@ts-ignore
     $: myProfile = get(store.profilesStore.myProfile).value
    $: myName =  myProfile ? myProfile.nickname  : ""
    let editAvatarDialog

    onMount(async () => {
        // if (!myName) {
        //     editAvatarDialog.open()
        // }
	});

    const editAvatar = () => {
        editAvatarDialog.open()
    }

</script>
{#if !isWeaveContext()}
    <div class="nav-button " on:click={editAvatar} title={myName ? myName:"Edit Avatar"}>
        <Avatar size={16} agentPubKey={store.myAgentPubKey} placeholder={true} showNickname={false}/>
    </div>
{/if}


<AvatarDialog bind:this={editAvatarDialog} />

<style>
</style>