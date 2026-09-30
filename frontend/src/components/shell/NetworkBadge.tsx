import { formatNetworkName } from '../../lib/ui/format.js';
import { StatusBadge } from '../ui/StatusBadge.js';

export const NetworkBadge = ({
  expectedNetworkId,
  walletConnected,
  networkMismatch
}: {
  expectedNetworkId: string | null;
  walletConnected: boolean;
  networkMismatch: boolean;
}) => {
  if (!expectedNetworkId) {
    return <StatusBadge tone="neutral">Not configured</StatusBadge>;
  }
  if (walletConnected && networkMismatch) {
    return <StatusBadge tone="danger">Network mismatch</StatusBadge>;
  }
  return (
    <StatusBadge tone={walletConnected ? 'success' : 'info'}>{formatNetworkName(expectedNetworkId)}</StatusBadge>
  );
};
