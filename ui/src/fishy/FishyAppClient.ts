/**
 * FishyAppClient - AppClient implementation for the Fishy browser extension
 *
 * This adapter implements the @holochain/client AppClient interface
 * using the window.holochain API provided by the Fishy extension.
 */

import {
  CellType,
  SignalType,
  type AppClient,
  type AppInfo,
  type CallZomeRequest,
  type RoleNameCallZomeRequest,
  type SignalCb,
  type AgentPubKey,
  type InstalledAppId,
  type CellId,
  type CreateCloneCellRequest,
  type CreateCloneCellResponse,
  type EnableCloneCellRequest,
  type EnableCloneCellResponse,
  type DisableCloneCellRequest,
  type DisableCloneCellResponse,
  type AppDumpNetworkStatsResponse,
  type DumpNetworkMetricsRequest,
  type DumpNetworkMetricsResponse,
  type Signal,
} from "@holochain/client";
import type { UnsubscribeFunction } from "emittery";

/**
 * The window.holochain API provided by Fishy extension
 */
interface FishyHolochainAPI {
  isFishy: boolean;
  version: string;
  myPubKey: Uint8Array | null;
  installedAppId: string | null;
  connect(): Promise<any>;
  disconnect(): Promise<any>;
  callZome(params: any): Promise<any>;
  appInfo(installedAppId?: string): Promise<any>;
  installApp(request: { bundle: Uint8Array | number[]; installedAppId?: string }): Promise<any>;
  on(event: "signal", callback: (signal: any) => void): () => void;
  configureNetwork(config: { gatewayUrl: string }): Promise<any>;
  getNetworkStatus(): Promise<any>;
}

declare global {
  interface Window {
    holochain?: FishyHolochainAPI;
  }
}

/**
 * FishyAppClient implements the AppClient interface from @holochain/client
 * using the Fishy browser extension's window.holochain API.
 */
export class FishyAppClient implements AppClient {
  private _myPubKey: AgentPubKey | null = null;
  private _installedAppId: InstalledAppId = "";
  private _cellId: CellId | null = null;
  private _roleName: string = "ziptest";
  private signalHandlers = new Set<SignalCb>();
  private unsubscribeFishy: (() => void) | null = null;

  get myPubKey(): AgentPubKey {
    if (!this._myPubKey) throw new Error("Not connected - myPubKey not available");
    return this._myPubKey;
  }

  get installedAppId(): InstalledAppId {
    return this._installedAppId;
  }

  /**
   * Create and connect a FishyAppClient
   *
   * @param gatewayUrl - URL of the hc-http-gw instance
   * @returns Connected FishyAppClient
   */
  static async connect(gatewayUrl: string): Promise<FishyAppClient> {
    const client = new FishyAppClient();
    await client.initialize(gatewayUrl);
    return client;
  }

  private async initialize(gatewayUrl: string): Promise<void> {
    const holochain = window.holochain;
    if (!holochain?.isFishy) {
      throw new Error("Fishy extension not detected. Please install the Fishy browser extension.");
    }

    // Configure gateway
    await holochain.configureNetwork({ gatewayUrl });

    // Connect (triggers authorization popup if needed)
    await holochain.connect();

    // Check if hApp is installed by getting app info
    try {
      const info = await holochain.appInfo();
      if (info?.agentPubKey && info?.cells?.length > 0) {
        // Already installed
        this._myPubKey = this.toUint8Array(info.agentPubKey);
        this._installedAppId = info.contextId || "ziptest";
        this._cellId = [
          this.toUint8Array(info.cells[0][0]),
          this.toUint8Array(info.cells[0][1])
        ];
        this.setupSignalForwarding();
        return;
      }
    } catch (e) {
      // Not installed yet, continue to installation
      console.log("hApp not installed, will install...");
    }

    // Install hApp
    await this.installHapp();

    // Get app info after install
    const info = await holochain.appInfo();
    if (!info?.agentPubKey) {
      throw new Error("Failed to get app info after installation");
    }

    this._myPubKey = this.toUint8Array(info.agentPubKey);
    this._installedAppId = info.contextId || "ziptest";
    this._cellId = [
      this.toUint8Array(info.cells[0][0]),
      this.toUint8Array(info.cells[0][1])
    ];

    this.setupSignalForwarding();
  }

  private async installHapp(): Promise<void> {
    const holochain = window.holochain;
    if (!holochain) throw new Error("Fishy extension not available");

    // Fetch bundled hApp from public directory
    const response = await fetch('./ziptest.happ');
    if (!response.ok) {
      throw new Error(`Failed to fetch hApp bundle: ${response.status} ${response.statusText}`);
    }
    const bundle = new Uint8Array(await response.arrayBuffer());

    console.log("Installing ziptest.happ...");
    await holochain.installApp({
      bundle,
      installedAppId: 'ziptest',
    });
    console.log("hApp installed successfully");
  }

  private setupSignalForwarding(): void {
    const holochain = window.holochain;
    if (!holochain) return;

    // Subscribe to signals from extension
    this.unsubscribeFishy = holochain.on("signal", (rawSignal: any) => {
      console.log("[FishyAppClient] Raw signal received:", rawSignal);

      // Convert to standard Signal format expected by @holochain/client
      const signal: Signal = {
        type: SignalType.App,
        value: {
          cell_id: rawSignal.value?.cell_id
            ? [this.toUint8Array(rawSignal.value.cell_id[0]), this.toUint8Array(rawSignal.value.cell_id[1])]
            : this._cellId!,
          zome_name: rawSignal.value?.zome_name || "",
          payload: rawSignal.value?.payload,
        },
      };

      // Dispatch to all registered handlers
      this.signalHandlers.forEach((handler) => {
        try {
          handler(signal);
        } catch (e) {
          console.error("[FishyAppClient] Signal handler error:", e);
        }
      });
    });
  }

  /**
   * Call a zome function
   */
  async callZome(
    args: CallZomeRequest | RoleNameCallZomeRequest,
    timeout?: number
  ): Promise<any> {
    const holochain = window.holochain;
    if (!holochain) throw new Error("Fishy extension not available");

    // Determine cell_id
    let cell_id: CellId;
    if ('role_name' in args) {
      // RoleNameCallZomeRequest - use stored cell_id
      if (!this._cellId) {
        throw new Error("No cell_id available - not connected");
      }
      cell_id = this._cellId;
    } else {
      cell_id = args.cell_id;
    }

    const result = await holochain.callZome({
      cell_id,
      zome_name: args.zome_name,
      fn_name: args.fn_name,
      payload: args.payload,
      provenance: args.provenance || this._myPubKey,
      cap_secret: args.cap_secret,
    });

    return result;
  }

  /**
   * Subscribe to signals
   */
  on<Name extends keyof { signal: Signal }>(
    eventName: Name | readonly Name[],
    listener: SignalCb
  ): UnsubscribeFunction {
    const events = Array.isArray(eventName) ? eventName : [eventName];

    if (events.includes("signal" as Name)) {
      this.signalHandlers.add(listener);
      return () => {
        this.signalHandlers.delete(listener);
      };
    }

    // Return no-op unsubscribe for unknown events
    return () => {};
  }

  /**
   * Get app info in standard @holochain/client format
   */
  async appInfo(): Promise<AppInfo | null> {
    const holochain = window.holochain;
    if (!holochain) throw new Error("Fishy extension not available");

    const info = await holochain.appInfo();
    if (!info) return null;

    // Convert fishy format to standard AppInfo format
    // Fishy returns: { contextId, agentPubKey, cells: [[dnaHash, agentKey]] }
    // Must return: { installed_app_id, agent_pub_key, cell_info: { role: [{ type, value: {...} }] } }

    const agentPubKey = this.toUint8Array(info.agentPubKey);
    const cellId: CellId = [
      this.toUint8Array(info.cells[0][0]),
      this.toUint8Array(info.cells[0][1])
    ];

    const appInfo: AppInfo = {
      installed_app_id: info.contextId || this._installedAppId,
      agent_pub_key: agentPubKey,
      cell_info: {
        [this._roleName]: [{
          type: CellType.Provisioned,
          value: {
            cell_id: cellId,
            dna_modifiers: {
              network_seed: "",
              properties: {},
              origin_time: 0,
              quantum_time: { secs: 0, nanos: 0 },
            },
            name: this._roleName,
          },
        }],
      },
      status: { type: "running" } as any, // Simplified status
      installed_at: Date.now() * 1000, // Approximate
    };

    return appInfo;
  }

  // --- Stub implementations for methods not supported by Fishy ---

  async dumpNetworkStats(): Promise<AppDumpNetworkStatsResponse> {
    console.warn("[FishyAppClient] dumpNetworkStats not supported in Fishy mode");
    return { peer_urls: [], connections: [] } as any;
  }

  async dumpNetworkMetrics(args: DumpNetworkMetricsRequest): Promise<DumpNetworkMetricsResponse> {
    console.warn("[FishyAppClient] dumpNetworkMetrics not supported in Fishy mode");
    return {} as any;
  }

  async createCloneCell(args: CreateCloneCellRequest): Promise<CreateCloneCellResponse> {
    throw new Error("createCloneCell not supported in Fishy mode");
  }

  async enableCloneCell(args: EnableCloneCellRequest): Promise<EnableCloneCellResponse> {
    throw new Error("enableCloneCell not supported in Fishy mode");
  }

  async disableCloneCell(args: DisableCloneCellRequest): Promise<DisableCloneCellResponse> {
    throw new Error("disableCloneCell not supported in Fishy mode");
  }

  // --- Helper methods ---

  /**
   * Convert Chrome message object or array back to Uint8Array
   * Chrome's message passing converts Uint8Array to objects with numeric keys
   */
  private toUint8Array(data: any): Uint8Array {
    if (!data) return new Uint8Array();
    if (data instanceof Uint8Array) return data;
    if (Array.isArray(data)) return new Uint8Array(data);
    if (typeof data === "object") {
      // Chrome converts Uint8Array to { 0: x, 1: y, ... }
      const values = Object.values(data) as number[];
      return new Uint8Array(values);
    }
    return new Uint8Array();
  }
}

/**
 * Wait for the Fishy extension to be ready
 *
 * @param timeoutMs - Maximum time to wait (default 5000ms)
 * @returns Promise that resolves when extension is ready
 */
export function waitForFishy(timeoutMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already ready
    if (window.holochain?.isFishy) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Fishy extension not detected. Please install the Fishy browser extension."));
    }, timeoutMs);

    window.addEventListener("fishy:ready", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}
