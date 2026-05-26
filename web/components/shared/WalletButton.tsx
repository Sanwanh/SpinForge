'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function WalletButton() {
  const account = useCurrentAccount();

  return (
    <div className="flex items-center gap-2">
      {account && (
        <span className="hidden text-xs text-gray-400 sm:inline">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </span>
      )}
      <ConnectButton
        connectText="Connect Wallet"
        className="btn-primary !rounded-lg !px-4 !py-2 !text-sm !font-semibold"
      />
    </div>
  );
}
