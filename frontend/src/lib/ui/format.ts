/** Shortens a long value for display, keeping the start and end. */
export const shortenMiddle = (value: string, head = 10, tail = 6): string =>
  value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;

/** Capitalises a network id for display, e.g. "preprod" -> "Preprod". */
export const formatNetworkName = (networkId: string): string =>
  networkId.length === 0 ? networkId : networkId.charAt(0).toUpperCase() + networkId.slice(1);

/**
 * Copies text to the clipboard. Returns false when the Clipboard API is
 * unavailable or refuses the write, so callers can show an honest message
 * instead of claiming success.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
