import { useState } from "react";
import { GAME_CHAIN, SHARED_VAULT_ADDRESS } from "../config";

// A shared vault (set in config) is used by everyone. Otherwise the deployed
// address is remembered per chain in localStorage so it survives refreshes.
const key = `mines-vault:${GAME_CHAIN.id}`;

export function useVaultAddress() {
  const [stored, setStored] = useState<`0x${string}` | null>(
    () => (localStorage.getItem(key) as `0x${string}` | null) ?? null
  );

  // A configured shared vault always wins — that's the live/shared demo.
  const vaultAddress = SHARED_VAULT_ADDRESS ?? stored;
  const isShared = SHARED_VAULT_ADDRESS !== null;

  const setVaultAddress = (a: `0x${string}`) => {
    localStorage.setItem(key, a);
    setStored(a);
  };

  return { vaultAddress, setVaultAddress, isShared };
}
