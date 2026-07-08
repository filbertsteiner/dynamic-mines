import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  type WalletClient,
} from "viem";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import { addNetwork, switchActiveNetwork } from "@dynamic-labs-sdk/client";
import type { DynamicClient } from "@dynamic-labs-sdk/client";
import { GAME_CHAIN, GAME_NETWORK_DATA } from "../config";
import { VAULT_ABI, VAULT_BYTECODE } from "../contracts/vault";
import { useDevLog } from "../dev/DevLog";

type EvmAccount = Parameters<
  typeof createWalletClientForWalletAccount
>[0]["walletAccount"];

// Read-only client for the game chain — balances and receipts.
const publicClient = createPublicClient({
  chain: GAME_CHAIN,
  transport: http(),
});

export function useEvmMoney(walletAccount: EvmAccount, client: DynamicClient) {
  const address = walletAccount.address as `0x${string}`;
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    null | "deploy" | "deposit" | "withdraw" | "sweep"
  >(null);
  const { log } = useDevLog();

  const refreshBalance = useCallback(async () => {
    const wei = await publicClient.getBalance({ address });
    setBalanceEth(formatEther(wei));
  }, [address]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  // Ensures the wallet is on the game chain, then returns a viem wallet client.
  // The SDK defaults the active network to Ethereum mainnet, so this is required.
  const getWalletClient = useCallback(async (): Promise<WalletClient> => {
    try {
      await addNetwork({ networkData: GAME_NETWORK_DATA, walletAccount }, client);
    } catch {
      /* already registered */
    }
    await switchActiveNetwork(
      { networkId: String(GAME_CHAIN.id), walletAccount },
      client
    );
    return createWalletClientForWalletAccount({ walletAccount }, client);
  }, [walletAccount, client]);

  // One-time: deploy the escrow vault from the user's own embedded wallet.
  const deployVault = useCallback(async (): Promise<`0x${string}`> => {
    setBusy("deploy");
    try {
      const wc = await getWalletClient();
      log({
        category: "tx",
        onChain: true,
        title: "Deploying GameVault contract…",
        detail: "Signed by your embedded wallet. No owner, no admin drain.",
      });
      const hash = await wc.deployContract({
        abi: VAULT_ABI,
        bytecode: VAULT_BYTECODE,
        account: wc.account!,
        chain: GAME_CHAIN,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (!receipt.contractAddress) throw new Error("No contract address");
      log({
        category: "tx",
        onChain: true,
        title: "Vault deployed ✓",
        detail: `contract: ${receipt.contractAddress}\ntx: ${hash}`,
      });
      await refreshBalance();
      return receipt.contractAddress;
    } finally {
      setBusy(null);
    }
  }, [getWalletClient, log, refreshBalance]);

  const deposit = useCallback(
    async (amountEth: string, vault: `0x${string}`): Promise<`0x${string}`> => {
      setBusy("deposit");
      try {
        const wc = await getWalletClient();
        log({
          category: "tx",
          onChain: true,
          title: `vault.deposit() — ${amountEth} ETH`,
          detail: `vault: ${vault}\nvalue: ${amountEth} ETH`,
        });
        const hash = await wc.writeContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "deposit",
          value: parseEther(amountEth),
          account: wc.account!,
          chain: GAME_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log({ category: "tx", onChain: true, title: "Deposit confirmed ✓", detail: `tx: ${hash}` });
        await refreshBalance();
        return hash;
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, log, refreshBalance]
  );

  const withdraw = useCallback(
    async (amountWei: bigint, vault: `0x${string}`): Promise<`0x${string}`> => {
      setBusy("withdraw");
      try {
        const wc = await getWalletClient();
        log({
          category: "tx",
          onChain: true,
          title: `vault.withdraw() — ${formatEther(amountWei)} ETH`,
          detail: `vault: ${vault}\nContract sends funds back to you — capped to your deposits.`,
        });
        const hash = await wc.writeContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "withdraw",
          args: [amountWei],
          account: wc.account!,
          chain: GAME_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log({ category: "tx", onChain: true, title: "Withdrawal confirmed ✓", detail: `tx: ${hash}` });
        await refreshBalance();
        return hash;
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, log, refreshBalance]
  );

  // Real-time settlement: as credits are spent, move that value from the
  // player's withdrawable balance into house revenue. Runs in the background
  // (no `busy` state) so it doesn't block gameplay.
  const settle = useCallback(
    async (amountWei: bigint, vault: `0x${string}`): Promise<`0x${string}`> => {
      const wc = await getWalletClient();
      log({
        category: "tx",
        onChain: true,
        title: `vault.settle() — ${formatEther(amountWei)} ETH → revenue`,
      });
      const hash = await wc.writeContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "settle",
        args: [amountWei],
        account: wc.account!,
        chain: GAME_CHAIN,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      log({ category: "tx", onChain: true, title: "Revenue realized on-chain ✓", detail: `tx: ${hash}` });
      return hash;
    },
    [getWalletClient, log]
  );

  // Player cash-out that settles losses: forfeit `forfeitWei` to house revenue
  // and withdraw the rest. Keeps on-chain accounting honest.
  const cashOut = useCallback(
    async (forfeitWei: bigint, vault: `0x${string}`): Promise<`0x${string}`> => {
      setBusy("withdraw");
      try {
        const wc = await getWalletClient();
        log({
          category: "tx",
          onChain: true,
          title: `vault.cashOut() — forfeit ${formatEther(forfeitWei)} ETH`,
          detail: `settles game losses → surplus, withdraws remaining balance`,
        });
        const hash = await wc.writeContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "cashOut",
          args: [forfeitWei],
          account: wc.account!,
          chain: GAME_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log({ category: "tx", onChain: true, title: "Cash-out confirmed ✓", detail: `tx: ${hash}` });
        await refreshBalance();
        return hash;
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, log, refreshBalance]
  );

  // On-chain balance the vault owes this player.
  const readVaultBalance = useCallback(
    async (vault: `0x${string}`): Promise<string> => {
      const wei = (await publicClient.readContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "balances",
        args: [address],
      })) as bigint;
      return formatEther(wei);
    },
    [address]
  );

  // Who owns (can sweep) the vault, and how much ETH it holds in total.
  const readOwner = useCallback(
    (vault: `0x${string}`) =>
      publicClient.readContract({
        address: vault,
        abi: VAULT_ABI,
        functionName: "owner",
      }) as Promise<`0x${string}`>,
    []
  );
  const readVaultTotal = useCallback(
    async (vault: `0x${string}`) =>
      formatEther(await publicClient.getBalance({ address: vault })),
    []
  );
  // Realized revenue available to sweep (contract balance not owed to players).
  const readSurplus = useCallback(
    async (vault: `0x${string}`) =>
      formatEther(
        (await publicClient.readContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "surplus",
        })) as bigint
      ),
    []
  );

  // Owner-only: record a player's game losses as house revenue (moves that
  // amount out of the player's withdrawable balance into sweepable surplus).
  const realizeRevenue = useCallback(
    async (
      player: `0x${string}`,
      amountWei: bigint,
      vault: `0x${string}`
    ): Promise<`0x${string}`> => {
      setBusy("sweep");
      try {
        const wc = await getWalletClient();
        log({
          category: "tx",
          onChain: true,
          title: `vault.realizeRevenue() — ${formatEther(amountWei)} ETH`,
          detail: `player: ${player}\nmoves lost funds from withdrawable → house revenue`,
        });
        const hash = await wc.writeContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "realizeRevenue",
          args: [player, amountWei],
          account: wc.account!,
          chain: GAME_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log({ category: "tx", onChain: true, title: "Revenue realized ✓", detail: `tx: ${hash}` });
        return hash;
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, log]
  );

  // Owner-only: move funds out of the vault (refund / redistribute / collect).
  const sweep = useCallback(
    async (
      to: `0x${string}`,
      amountWei: bigint,
      vault: `0x${string}`
    ): Promise<`0x${string}`> => {
      setBusy("sweep");
      try {
        const wc = await getWalletClient();
        log({
          category: "tx",
          onChain: true,
          title: `vault.sweep() — ${formatEther(amountWei)} ETH`,
          detail: `to: ${to}\nowner-only operator action`,
        });
        const hash = await wc.writeContract({
          address: vault,
          abi: VAULT_ABI,
          functionName: "sweep",
          args: [to, amountWei],
          account: wc.account!,
          chain: GAME_CHAIN,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log({ category: "tx", onChain: true, title: "Sweep confirmed ✓", detail: `tx: ${hash}` });
        await refreshBalance();
        return hash;
      } finally {
        setBusy(null);
      }
    },
    [getWalletClient, log, refreshBalance]
  );

  return {
    address,
    balanceEth,
    refreshBalance,
    deployVault,
    deposit,
    withdraw,
    cashOut,
    settle,
    readVaultBalance,
    readOwner,
    readVaultTotal,
    readSurplus,
    realizeRevenue,
    sweep,
    busy,
  };
}
