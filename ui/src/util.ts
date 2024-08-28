import type { ProfilesClient } from "@holochain-open-dev/profiles";
import { type AppClient, type EntryHash, type DnaHash, CellType } from "@holochain/client";
import { readable } from "svelte/store";

// @ts-ignore because this is magic maid available in the vite.config.ts and I don't
// know how to get around the error messages
export const APP_VERSION = __APP_VERSION__
export type WALUrl = string

export let PROFILES_CLIENT : ProfilesClient | undefined

export const setProfilesClient = (client: ProfilesClient) => {
  PROFILES_CLIENT = client
}

export const hashEqual = (a:EntryHash, b:EntryHash) : boolean => {
  if (!a || !b) {
    return !a && !b
  }
  for (let i = a.length; -1 < i; i -= 1) {
    if ((a[i] !== b[i])) return false;
  }
  return true;
}

export const getMyDna = async (role:string, client: AppClient) : Promise<DnaHash>  => {
  const appInfo = await client.appInfo();
  const dnaHash = (appInfo.cell_info[role][0] as any)[
    CellType.Provisioned
  ].cell_id[0];
  return dnaHash
} 

export const isActive = (lastSeen, hash) => {
  const seen = lastSeen.get(hash)
  if (!seen) return false
  return Date.now()-seen < 11000
}

export const time = readable(Date.now(), function start(set) {
	const interval = setInterval(() => {
		set(Date.now());
	}, 1000);

	return function stop() {
		clearInterval(interval);
	};
});