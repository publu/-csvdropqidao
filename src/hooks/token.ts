import { SafeAppProvider } from "@gnosis.pm/safe-apps-provider";
import { useSafeAppsSDK } from "@gnosis.pm/safe-apps-react-sdk";
import { ethers, utils } from "ethers";
import xdaiTokens from "honeyswap-default-token-list";
import { useState, useEffect, useMemo } from "react";

import { networkInfo } from "../networks";
import rinkeby from "../static/rinkebyTokens.json";
import { erc20Instance } from "../transfers/erc20";
import { TokenInfo } from "../utils";

export const CUSTOM_TOKENS: TokenInfo[] = [
  {
    chainId: 250,
    address: "0x68Aa691a8819B07988B18923F712F3f4C8d36346",
    name: "Qi Dao Protocol",
    symbol: "QI",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/15329/small/qi.png?1620540969",
  },
  {
    chainId: 137,
    address: "0x580A84C73811E1839F75d86d75d88cCa0c241fF4",
    name: "Qi Dao Protocol",
    symbol: "QI",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/15329/small/qi.png?1620540969",
  },
  {
    chainId: 10,
    address: "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
    name: "Qi Dao Protocol",
    symbol: "QI",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/15329/small/qi.png?1620540969",
  },
];

export type TokenMap = Map<string | null, MinimalTokenInfo>;

function tokenMap(tokenList: TokenInfo[]): TokenMap {
  const res: TokenMap = new Map<string, MinimalTokenInfo>();
  for (const token of tokenList) {
    if (token.address) {
      res.set(utils.getAddress(token.address), token);
    }
  }
  return res;
}

export const fetchTokenList = async (chainId: number): Promise<TokenMap> => {
  let tokens: TokenInfo[];
  switch (chainId) {
    case 1:
      const mainnetTokenURL = "https://tokens.coingecko.com/uniswap/all.json";
      tokens = (await (await fetch(mainnetTokenURL)).json()).tokens;
      break;
    case 4:
      // Hardcoded this because the list provided at
      // https://github.com/Uniswap/default-token-list/blob/master/src/tokens/rinkeby.json
      // Doesn't have GNO or OWL and/or many others.
      tokens = rinkeby;
      break;
    case 100:
      tokens = xdaiTokens.tokens;
      break;
    default:
      //console.warn(`Unimplemented token list for ${networkInfo.get(chainId)?.name} network`);
      tokens = [];
  }
  tokens.push(...CUSTOM_TOKENS);
  return tokenMap(tokens);
};

/**
 * Hook which fetches the tokenList for Components.
 * Will Execute only once on initial load.
 */
export function useTokenList(): {
  tokenList: TokenMap;
  isLoading: boolean;
} {
  const { safe } = useSafeAppsSDK();
  const [tokenList, setTokenList] = useState<TokenMap>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchTokenList(safe.chainId).then((result) => {
      if (isMounted) {
        setTokenList(result);
        setIsLoading(false);
      }
    });
    return function callback() {
      isMounted = false;
    };
  }, [safe.chainId]);
  return { tokenList, isLoading };
}

export type MinimalTokenInfo = {
  decimals: number;
  address: string;
  symbol?: string;
  logoURI?: string;
};

export interface TokenInfoProvider {
  getTokenInfo: (tokenAddress: string) => Promise<MinimalTokenInfo | undefined>;
  getNativeTokenSymbol: () => string;
  getSelectedNetworkShortname: () => string | undefined;
}

export const useTokenInfoProvider: () => TokenInfoProvider = () => {
  const { safe, sdk } = useSafeAppsSDK();
  const web3Provider = useMemo(() => new ethers.providers.Web3Provider(new SafeAppProvider(safe, sdk)), [sdk, safe]);
  const { tokenList } = useTokenList();

  return useMemo(
    () => ({
      getTokenInfo: async (tokenAddress: string) => {
        if (tokenList?.has(tokenAddress)) {
          return tokenList.get(tokenAddress);
        } else {
          const tokenContract = erc20Instance(tokenAddress, web3Provider);
          const decimals = await tokenContract.decimals().catch((reason) => undefined);
          const symbol = await tokenContract.symbol().catch((reason) => undefined);

          if (typeof decimals !== "undefined") {
            tokenList?.set(tokenAddress, {
              decimals,
              symbol,
              address: tokenAddress,
            });
            return { decimals, symbol, address: tokenAddress };
          } else {
            return undefined;
          }
        }
      },
      getNativeTokenSymbol: () => networkInfo.get(safe.chainId)?.currencySymbol ?? "ETH",
      getSelectedNetworkShortname: () => networkInfo.get(safe.chainId)?.shortName,
    }),
    [safe.chainId, tokenList, web3Provider],
  );
};
