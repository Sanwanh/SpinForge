import { SUI_NETWORK } from './constants';

const FULLNODE_URLS: Record<string, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
};

export function getFullnodeUrl(network: string): string {
  return FULLNODE_URLS[network] ?? FULLNODE_URLS.testnet;
}

export const suiFullnodeUrl = getFullnodeUrl(SUI_NETWORK);
