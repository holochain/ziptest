import { LazyHoloHashMap, type EntryRecord } from "@holochain-open-dev/utils";
import type { ActionHash, Link } from "@holochain/client";
import type { ZipTestClient } from "./store";
import {
  asyncDerived,
  collectionStore,
  joinAsync,
  latestVersionOfEntryStore,
  pipe,
  sliceAndJoin,
  type AsyncReadable,
} from "@holochain-open-dev/stores";

export type Thing = {
  content: string;
};
export type ThingData = {
  originalHash: ActionHash;
  content: string;
  record: EntryRecord<Thing>;
};

export class ThingStore {
  thingLinks: AsyncReadable<Link[]>;
  thingHashes: AsyncReadable<ActionHash[]>;
  things: LazyHoloHashMap<ActionHash, AsyncReadable<ThingData>> =
    new LazyHoloHashMap((hash: ActionHash) => {
      const latestVersion = latestVersionOfEntryStore(this.client, () =>
        this.client.getThing(hash)
      );
      const asyncThing = pipe(latestVersion, (record) => record.entry.content);
      return pipe(
        joinAsync([asyncThing, latestVersion]),
        ([content, record]) => {
          return { originalHash: hash, content, record };
        }
      );
    });
  thingsList: AsyncReadable<ThingData[]>;

  constructor(public client: ZipTestClient) {
    this.thingLinks = collectionStore(
      this.client,
      () => this.client.getThings(),
      "AllThings",
      1000
    );
    this.thingHashes = asyncDerived(this.thingLinks, (links) =>
      links.map((link) => link.target)
    );
    this.thingsList = pipe(
      this.thingHashes,
      (hashes) => sliceAndJoin(this.things, hashes),
      (map) => Array.from(map.values())
    );
  }
}
