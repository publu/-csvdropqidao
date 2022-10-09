import { BigNumber } from "bignumber.js";
import { getAddress } from "ethers/lib/utils";

export const ZERO = new BigNumber(0);
export const ONE = new BigNumber(1);
export const TWO = new BigNumber(2);
export const TEN = new BigNumber(10);
export const MAX_U256 = TWO.pow(255).minus(1);

export interface TokenInfo {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly decimals: number;
  readonly symbol: string;
  readonly logoURI?: string;
  readonly tags?: string[];
  readonly extensions?: {
    readonly [key: string]: string | number | boolean | null;
  };
}

export function toWei(amount: string | number | BigNumber, decimals: number): BigNumber {
  let res = TEN.pow(decimals).multipliedBy(amount);
  if (res.decimalPlaces() > 0) {
    // TODO - reinstate this warning by passing along with return content
    // Return (Transaction[], Message)
    // setLastError({
    //   message:
    //     "Precision too high. Some digits are ignored for row " + index,
    // });
    res = res.decimalPlaces(0, BigNumber.ROUND_DOWN);
  }
  return res;
}

export function fromWei(amount: BigNumber, decimals: number): BigNumber {
  return amount.dividedBy(TEN.pow(decimals));
}

/**
 * Replaces ipfs:// part of the uri with the infura.io ipfs endpoint.
 *
 * @param uri URI which might be a ipfs url
 * @returns URI resolved to the infura ipfs host or uri if it's not an ipfs uri.
 */
export function resolveIpfsUri(uri: string): string {
  return uri.startsWith("ipfs://") ? uri.replace("ipfs://", "https://ipfs.infura.io/ipfs/") : uri;
}

export const chunkArray = (array: any[], itemsPerChunk: number) => {
  let chunked: any[] = [];
  for (let i = 0; i < array.length; i += itemsPerChunk) {
    chunked.push(array.slice(i, i + itemsPerChunk));
  }
  return chunked;
};

export const chunkArrayDecrementingChunkSize = (array: any[], firstChunkItems: number) => {
  let toDecrement = 0;
  let chunked: any[] = [];
  for (let i = 0; i < array.length; i += firstChunkItems - toDecrement) {
    toDecrement = chunked.length;
    chunked.push(array.slice(i, i + firstChunkItems - toDecrement));
  }
  return chunked;
};

// returns the checksummed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}
export function shortenAddress(address: string, chars = 4): string {
  const parsed = isAddress(address);
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`;
}
