<script lang="ts">
  import Controller from './Controller.svelte'
  import ControllerStream from './ControllerStream.svelte'
  import { AppWebsocket, AdminWebsocket, type AppClient, type AppWebsocketConnectionOptions } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import { WeaveClient, isWeaveContext, initializeHotReload, type Hrl, type WAL } from '@theweave/api';
  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
  import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
  import LogoIcon from "./icons/LogoIcon.svelte";
  import { appletServices } from './we';
  import { setProfilesClient } from './util';

  const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'ziptest'
  const roleName = 'ziptest'
  const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
  const adminPort = import.meta.env.VITE_ADMIN_PORT
  const url = `ws://localhost:${appPort}`;

  let client: AppWebsocket
  let weaveClient: WeaveClient  
  let profilesStore : ProfilesStore|undefined = undefined

  let connected = false

  let createView
  enum RenderType {
    App,
    Stream,
  }

  let renderType = RenderType.App
  let wal: WAL

  initialize()

  async function initialize() : Promise<void> {
    let profilesClient
    if ((import.meta as any).env.DEV) {
      try {
        await initializeHotReload();
      } catch (e) {
        console.warn("Could not initialize applet hot-reloading. This is only expected to work in a We context in dev mode.")
      }
    }
    let tokenResp
    if (!isWeaveContext()) {
        console.log("adminPort is", adminPort)
        if (adminPort) {
          const url = `ws://localhost:${adminPort}`

          const adminWebsocket = await AdminWebsocket.connect({url: new URL(url)})
          tokenResp = await adminWebsocket.issueAppAuthenticationToken({installed_app_id:appId})
          const x = await adminWebsocket.listApps({})
          console.log("apps", x)
          const cellIds = await adminWebsocket.listCellIds()
          console.log("CELL IDS",cellIds)
          await adminWebsocket.authorizeSigningCredentials(cellIds[0])
        }
        console.log("appPort and Id is", appPort, appId)
        const params: AppWebsocketConnectionOptions = {url: new URL(url)}
        if (tokenResp) params.token = tokenResp.token
        client = await AppWebsocket.connect(params)
        profilesClient = new ProfilesClient(client, appId);
    } 
    else {
      weaveClient = await WeaveClient.connect(appletServices);

      switch (weaveClient.renderInfo.type) {
        case "applet-view":
          switch (weaveClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the main view
              break;
            case "block":
              switch(weaveClient.renderInfo.view.block) {
                default:
                  throw new Error("Unknown applet-view block type:"+weaveClient.renderInfo.view.block);
              }
            case "asset":
              if (!weaveClient.renderInfo.view.recordInfo) {
                renderType = RenderType.Stream
                wal = weaveClient.renderInfo.view.wal
              } else {
                throw new Error(
                      "ZipTest has no entries"
                    );
              }
              break;
            case "creatable":
              break;
            default:
              throw new Error("Unsupported applet-view type");
          }
          break;
        case "cross-applet-view":
          switch (this.weaveClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the cross-applet main view
              //break;
            case "block":
              //
              //break;
            default:
              throw new Error("Unknown cross-applet-view render type.")
          }
          break;
        default:
          throw new Error("Unknown render view type");

      }

      //@ts-ignore
      client = weaveClient.renderInfo.appletClient;
      //@ts-ignore
      profilesClient = weaveClient.renderInfo.profilesClient;
    }
    setProfilesClient(profilesClient)
    profilesStore = new ProfilesStore(profilesClient);
    connected = true
  }
  $: prof = profilesStore ? profilesStore.myProfile : undefined

</script>

<svelte:head>
</svelte:head>
{#if connected}
  <profiles-context store={profilesStore}>
    {#if $prof.status=="pending"}
      <div class="loading"><div class="loader"></div></div>
    {:else if $prof.status=="complete" && $prof.value == undefined}
      <div class="create-profile">
        <div class="welcome-text"><LogoIcon /></div>
        <create-profile
          on:profile-created={()=>{}}
        ></create-profile>
      </div>
    {:else}
      {#if renderType== RenderType.App}
        <Controller  client={client} weaveClient={weaveClient} profilesStore={profilesStore} roleName={roleName}></Controller>
      {:else if  renderType== RenderType.Stream}
        <ControllerStream  streamId={wal.context} client={client} weaveClient={weaveClient} profilesStore={profilesStore} roleName={roleName}></ControllerStream>
      {/if}
    {/if}

  </profiles-context>
{:else}
  <div class="loading"><div class="loader"></div></div> 
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
    box-shadow: 0px 10px 10px rgba(0, 0, 0, .15);
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
    margin-left: auto;
    margin-right: auto;
    align-items: center;
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
  @-webkit-keyframes spin {
    0% { -webkit-transform: rotate(0deg); }
    100% { -webkit-transform: rotate(360deg); }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

</style>