/**
 * Fishy integration module for ziptest
 *
 * Provides FishyAppClient which implements @holochain/client's AppClient interface
 * using the Fishy browser extension's window.holochain API.
 */

export { FishyAppClient, waitForFishy } from './FishyAppClient';
