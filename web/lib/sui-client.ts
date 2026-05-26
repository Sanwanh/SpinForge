import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { SUI_NETWORK } from './constants';

export function createSuiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
}

export const suiClient = createSuiClient();
