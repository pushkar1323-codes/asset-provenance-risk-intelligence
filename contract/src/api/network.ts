/**
 * Thin wrapper around Midnight.js's global network identifier, which must
 * be set once at application startup before any chain operations run.
 */

import { setNetworkId, getNetworkId, type NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export type { NetworkId };

/** Sets the network the application will operate against (e.g. from configuration). */
export const configureNetwork = (networkId: NetworkId): void => {
  setNetworkId(networkId);
};

/** Returns the currently configured network, if {@link configureNetwork} has been called. */
export const getConfiguredNetwork = (): NetworkId => getNetworkId();
