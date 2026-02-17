<script lang="ts">
  import Controller from "./Controller.svelte";
  import type { AppClient } from "@holochain/client";
  import "@shoelace-style/shoelace/dist/themes/light.css";
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
  import { ProfilesStore } from "@holochain-open-dev/profiles";
  import LogoIcon from "./icons/LogoIcon.svelte";
  import { setProfilesClient } from "./util";
  import { WebConductorAppClient, waitForHolochain, ZeroArcProfilesClient } from "./hwc";

  // Linker URL from build-time environment variable
  const LINKER_URL = __LINKER_URL__ || "http://localhost:8000";
  const roleName = "ziptest";

  let client: AppClient;
  let profilesStore: ProfilesStore | undefined = undefined;

  let connected = false;
  let error: string | null = null;

  initialize();

  async function initialize(): Promise<void> {
    try {
      // Wait for Holochain extension to be ready
      if (!window.holochain?.isWebConductor) {
        console.log("Waiting for Holochain extension...");
        await waitForHolochain(10000);
      }

      console.log("Holochain extension detected, connecting...");

      // Connect via WebConductorAppClient
      client = await WebConductorAppClient.connect({
        linkerUrl: LINKER_URL,
        roleName: roleName,
      });

      console.log("Connected to Holochain, setting up profiles...");

      // Create ZeroArcProfilesClient for zero-arc nodes (always fetch from network)
      // This overrides the default local-first behavior of ProfilesClient
      const profilesClient = new ZeroArcProfilesClient(client, roleName);
      setProfilesClient(profilesClient);

      profilesStore = new ProfilesStore(profilesClient);
      connected = true;
      console.log("Initialization complete");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error("Failed to initialize:", e);
    }
  }

  $: prof = profilesStore ? profilesStore.myProfile : undefined;
</script>

<svelte:head></svelte:head>
{#if error}
  <div class="error-container">
    <h2>Connection Error</h2>
    <p class="error-message">{error}</p>
    <p class="error-help">
      Make sure the Holochain Web Conductor extension is installed and the linker is running at {LINKER_URL}.
    </p>
    <button on:click={() => window.location.reload()}>Retry</button>
  </div>
{:else if connected}
  <profiles-context store={profilesStore}>
    {#if $prof.status == "pending"}
      <div class="loading"><div class="loader"></div></div>
    {:else if $prof.status == "complete" && $prof.value == undefined}
      <div class="create-profile">
        <div class="welcome-text"><LogoIcon /></div>
        <create-profile on:profile-created={() => {}}></create-profile>
      </div>
    {:else}
      <Controller {client} weaveClient={null} {profilesStore} {roleName}></Controller>
    {/if}
  </profiles-context>
{:else}
  <div class="loading">
    <div class="loader"></div>
    <p>Connecting to Holochain extension...</p>
  </div>
{/if}

<style>
  .welcome-text {
    margin-bottom: 40px;
  }
  .create-profile {
    padding-top: 100px;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  create-profile {
    box-shadow: 0px 10px 10px rgba(0, 0, 0, 0.15);
  }
  :global(body) {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  :global(.loading) {
    text-align: center;
    padding-top: 100px;
    display: flex;
    flex-direction: column;
    margin-left: auto;
    margin-right: auto;
    align-items: center;
    gap: 20px;
  }
  :global(.loader) {
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 50px;
    height: 50px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
    display: inline-block;
  }
  .error-container {
    max-width: 500px;
    margin: 100px auto;
    padding: 30px;
    text-align: center;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .error-container h2 {
    color: #d32f2f;
    margin-bottom: 20px;
  }
  .error-message {
    background: #ffebee;
    padding: 15px;
    border-radius: 4px;
    color: #c62828;
    margin-bottom: 20px;
  }
  .error-help {
    color: #666;
    margin-bottom: 20px;
  }
  .error-container button {
    background: #3498db;
    color: white;
    border: none;
    padding: 10px 30px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }
  .error-container button:hover {
    background: #2980b9;
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
</style>
