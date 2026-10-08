import QRCode from "qrcode";

const WALLET_CONNECT_URI = /^wc:[0-9a-f]{32,}@2\?.+/i;

export function isWalletConnectUri(value: string): boolean {
  return value.length <= 4096 && WALLET_CONNECT_URI.test(value);
}

export async function pairingQrDataUrl(uri: string): Promise<string> {
  if (!isWalletConnectUri(uri)) {
    throw new Error("That string is not a WalletConnect pairing link.");
  }
  return QRCode.toDataURL(uri, {
    margin: 2,
    width: 280,
    errorCorrectionLevel: "M",
    color: { dark: "#120908", light: "#f0ebc6" },
  });
}
