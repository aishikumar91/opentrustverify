const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS.test(value);
}
