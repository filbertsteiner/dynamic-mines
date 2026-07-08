import { useEffect, useRef, useState } from "react";
import { parseEther, formatEther } from "viem";
import { getNetworksData } from "@dynamic-labs-sdk/client";
import type { DynamicClient, NetworkData } from "@dynamic-labs-sdk/client";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import { useEvmMoney } from "../wallet/useEvmMoney";
import { useVaultAddress } from "../wallet/useVaultAddress";
import { useGame } from "./GameProvider";
import { WalletSettings } from "./WalletSettings";
import { StepUpModal } from "./StepUpModal";
import {
  CREDITS_PER_ETH,
  FAUCET_URL,
  EXPLORER_TX_URL,
  EXPLORER_ADDRESS_URL,
  NETWORK_LABEL,
  GAME_CHAIN,
  ENVIRONMENT_ID,
  TREASURY_ADDRESS,
} from "../config";

type EvmAccount = Parameters<
  typeof createWalletClientForWalletAccount
>[0]["walletAccount"];

const DEPOSIT_PRESETS = ["0.001", "0.005", "0.01"];
const WEI_PER_CREDIT = parseEther("1") / BigInt(CREDITS_PER_ETH);

export function WalletPanel({
  walletAccount,
  client,
}: {
  walletAccount: EvmAccount;
  client: DynamicClient;
}) {
  const {
    address,
    balanceEth,
    refreshBalance,
    deployVault,
    deposit,
    cashOut,
    settle,
    readOwner,
    readVaultTotal,
    readVaultBalance,
    readSurplus,
    realizeRevenue,
    sweep,
    busy,
  } = useEvmMoney(walletAccount, client);
  const { vaultAddress, setVaultAddress, isShared } = useVaultAddress();
  const {
    credits,
    depositedCredits,
    withdrawableCredits,
    addDepositCredits,
    withdrawCredits,
  } = useGame();

  const [amount, setAmount] = useState(DEPOSIT_PRESETS[0]);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Operator (owner-only) state.
  const [isOwner, setIsOwner] = useState(false);
  const [vaultTotal, setVaultTotal] = useState<string | null>(null);
  const [surplus, setSurplus] = useState<string | null>(null);
  const [onchainBal, setOnchainBal] = useState<string | null>(null);
  const [sweepTo, setSweepTo] = useState<string>(TREASURY_ADDRESS);
  const [showStepUp, setShowStepUp] = useState(false);
  const [chainTick, setChainTick] = useState(0); // bump to refresh on-chain reads
  const settlingRef = useRef(false);

  useEffect(() => {
    if (!vaultAddress) return;
    let ok = true;
    void (async () => {
      try {
        const owner = await readOwner(vaultAddress);
        if (ok) setIsOwner(owner.toLowerCase() === address.toLowerCase());
        const [total, surp, bal] = await Promise.all([
          readVaultTotal(vaultAddress),
          readSurplus(vaultAddress),
          readVaultBalance(vaultAddress),
        ]);
        if (ok) {
          setVaultTotal(total);
          setSurplus(surp);
          setOnchainBal(bal);
        }
      } catch {
        /* vault not reachable */
      }
    })();
    return () => {
      ok = false;
    };
  }, [vaultAddress, address, readOwner, readVaultTotal, readSurplus, readVaultBalance, lastTx, chainTick]);

  // Real-time revenue recognition: whenever the player's on-chain balance
  // exceeds the value of their remaining credits (i.e. they've spent some),
  // settle that delta on-chain so it moves from "owed to players" to sweepable
  // revenue — live, as they play, without needing to withdraw.
  useEffect(() => {
    // Guard: only reconcile when there's a tracked deposit session, so a
    // cleared cache (credits=0) can never confiscate a real on-chain balance.
    if (!vaultAddress || settlingRef.current || busy !== null || depositedCredits <= 0)
      return;
    settlingRef.current = true;
    void (async () => {
      try {
        const onchainWei = parseEther(await readVaultBalance(vaultAddress));
        const remainingWei = BigInt(Math.max(0, credits)) * WEI_PER_CREDIT;
        const unrealized = onchainWei - remainingWei;
        if (unrealized >= WEI_PER_CREDIT) {
          await settle(unrealized, vaultAddress);
          setChainTick((t) => t + 1); // refresh displayed numbers + re-check
        }
      } catch {
        /* settle will retry on next credits change */
      } finally {
        settlingRef.current = false;
      }
    })();
  }, [credits, depositedCredits, vaultAddress, busy, chainTick, readVaultBalance, settle]);

  // How much this player has "lost" = on-chain withdrawable minus what their
  // remaining credits are worth. That delta is unrealized house revenue.
  const creditsWei = BigInt(Math.max(0, credits)) * WEI_PER_CREDIT;
  const unrealizedWei = onchainBal
    ? parseEther(onchainBal) - creditsWei
    : 0n;

  async function doRealize() {
    setError(null);
    if (!vaultAddress || unrealizedWei <= 0n) return;
    try {
      const hash = await realizeRevenue(address, unrealizedWei, vaultAddress);
      setLastTx(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Realize failed");
    }
  }

  async function doSweep() {
    setShowStepUp(false);
    setError(null);
    if (!vaultAddress || !surplus) return;
    try {
      const amountWei = parseEther(surplus);
      if (amountWei <= 0n) return;
      const hash = await sweep(sweepTo as `0x${string}`, amountWei, vaultAddress);
      setLastTx(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed");
    }
  }

  // Diagnostic: is the game chain actually enabled in this Dynamic environment?
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  useEffect(() => {
    try {
      setNetworks(getNetworksData(client));
    } catch {
      /* not ready */
    }
  }, [client]);
  const evmNetworks = networks.filter((n) => n.chain === "EVM");
  const gameChainEnabled = evmNetworks.some(
    (n) => n.networkId === String(GAME_CHAIN.id)
  );

  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      window.prompt("Copy your wallet address:", address);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onDeploy() {
    setError(null);
    try {
      const addr = await deployVault();
      setVaultAddress(addr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    }
  }

  async function onDeposit() {
    setError(null);
    if (!vaultAddress) return;
    try {
      const hash = await deposit(amount, vaultAddress);
      addDepositCredits(Math.round(Number(amount) * CREDITS_PER_ETH));
      setLastTx(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deposit failed");
    }
  }

  async function onWithdraw() {
    setError(null);
    if (!vaultAddress || withdrawableCredits <= 0) return;
    try {
      // Settle on-chain: forfeit whatever was lost (on-chain balance minus the
      // value of remaining credits) and withdraw the rest.
      const onchainWei = parseEther(await readVaultBalance(vaultAddress));
      const keepWei = BigInt(withdrawableCredits) * WEI_PER_CREDIT;
      const forfeitWei = onchainWei > keepWei ? onchainWei - keepWei : 0n;
      const hash = await cashOut(forfeitWei, vaultAddress);
      withdrawCredits(withdrawableCredits);
      setLastTx(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdraw failed");
    }
  }

  return (
    <div className="panel">
      <div className="row">
        <p className="panel-title">Your wallet</p>
        <span className="addr">
          <span className="net-badge">
            <span className="dot" /> {NETWORK_LABEL}
          </span>
          <button
            className="ghost"
            title="Wallet capabilities"
            onClick={() => setShowSettings(true)}
          >
            ⚙
          </button>
        </span>
      </div>

      {showSettings && <WalletSettings onClose={() => setShowSettings(false)} />}

      {evmNetworks.length > 0 && !gameChainEnabled && (
        <div className="banner">
          ⚠️ <strong>{NETWORK_LABEL}</strong> isn't enabled in your Dynamic
          dashboard, so transactions will fail. Enable it under{" "}
          <strong>Chains &amp; Networks</strong>. Currently enabled:{" "}
          {evmNetworks.map((n) => n.displayName).join(", ") || "none"}. (env{" "}
          <code>{ENVIRONMENT_ID.slice(0, 8)}…</code>)
        </div>
      )}

      <div className="row">
        <span className="label">Address</span>
        <span className="addr">
          <code title={address}>{short(address)}</code>
          <button
            className={`copy-btn${copied ? " copied" : ""}`}
            onClick={() => void copyAddress()}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </span>
      </div>

      <div className="row">
        <span className="label" />
        <a
          className="hint"
          href={EXPLORER_ADDRESS_URL(address)}
          target="_blank"
          rel="noreferrer"
        >
          View wallet on block explorer ↗
        </a>
      </div>

      <div className="row">
        <span className="label">On-chain balance</span>
        <span className="addr">
          <span className="big">
            {balanceEth === null ? "…" : `${Number(balanceEth).toFixed(5)} ETH`}
          </span>
          <button className="ghost" onClick={() => void refreshBalance()}>
            ↻
          </button>
        </span>
      </div>

      <div className="row">
        <span className="label">Game credits</span>
        <span className="big">{credits}</span>
      </div>

      {/* --- Vault: deploy once, then real on-chain deposit/withdraw --- */}
      {!vaultAddress ? (
        <div className="banner vault-cta">
          🏦 Deposits &amp; withdrawals run through an on-chain <strong>escrow
          vault</strong> — a contract that only ever returns funds to whoever
          deposited them. No house wallet, no admin key. Deploy it once from your
          own wallet:
          <button
            className="accent-btn"
            onClick={() => void onDeploy()}
            disabled={busy !== null}
          >
            {busy === "deploy" ? "Deploying…" : "Deploy game vault"}
          </button>
        </div>
      ) : (
        <>
          <div className="row">
            <span className="label">
              Vault contract{isShared ? " (shared)" : ""}
            </span>
            <span className="addr">
              <a
                className="hint"
                href={EXPLORER_ADDRESS_URL(vaultAddress)}
                target="_blank"
                rel="noreferrer"
              >
                {short(vaultAddress)} ↗
              </a>
              <button
                className="copy-btn"
                onClick={() => void navigator.clipboard.writeText(vaultAddress)}
              >
                Copy
              </button>
            </span>
          </div>
          {!isShared && (
            <p className="hint">
              To make this the vault for <em>all</em> players, paste this address
              into <code>SHARED_VAULT_ADDRESS</code> in <code>src/config.ts</code>.
            </p>
          )}
        </>
      )}

      <p className="hint">
        Need test-ETH? Grab free coins from the{" "}
        <a href={FAUCET_URL} target="_blank" rel="noreferrer">
          Base Sepolia faucet
        </a>
        .
      </p>

      <div className="deposit">
        <select value={amount} onChange={(e) => setAmount(e.target.value)}>
          {DEPOSIT_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p} ETH → {Math.round(Number(p) * CREDITS_PER_ETH)} credits
            </option>
          ))}
        </select>
        <button
          onClick={() => void onDeposit()}
          disabled={busy !== null || !vaultAddress}
        >
          {busy === "deposit" ? "Confirming…" : "Deposit"}
        </button>
        <button
          className="secondary"
          onClick={() => void onWithdraw()}
          disabled={busy !== null || !vaultAddress || withdrawableCredits <= 0}
        >
          {busy === "withdraw"
            ? "Confirming…"
            : `Withdraw ${withdrawableCredits > 0 ? withdrawableCredits : ""}`}
        </button>
      </div>

      {lastTx && (
        <p className="hint ok">
          Confirmed on-chain!{" "}
          <a href={EXPLORER_TX_URL(lastTx)} target="_blank" rel="noreferrer">
            View transaction ↗
          </a>
        </p>
      )}
      {error && <p className="hint err">{error}</p>}

      {/* Owner-only operator controls — realize revenue, then sweep to treasury. */}
      {isOwner && (
        <div className="operator">
          <div className="row">
            <span className="net-badge">🛠 Operator</span>
            <span className="label">
              Vault: {vaultTotal ? `${Number(vaultTotal).toFixed(5)} ETH` : "…"}
            </span>
          </div>
          <div className="row">
            <span className="label">Owed to players (locked)</span>
            <span>
              {vaultTotal && surplus
                ? `${(Number(vaultTotal) - Number(surplus)).toFixed(5)} ETH`
                : "…"}
            </span>
          </div>
          <div className="row">
            <span className="label">Realized revenue (sweepable)</span>
            <strong className="ok">
              {surplus ? `${Number(surplus).toFixed(5)} ETH` : "…"}
            </strong>
          </div>

          <button
            className="secondary"
            disabled={busy !== null || unrealizedWei <= 0n}
            onClick={() => void doRealize()}
          >
            {busy === "sweep"
              ? "Working…"
              : unrealizedWei > 0n
                ? `Realize ${Number(formatEther(unrealizedWei)).toFixed(5)} ETH revenue`
                : "No revenue to realize yet"}
          </button>

          <div className="row">
            <span className="label">Treasury (Fireblocks)</span>
            <a
              className="hint"
              href={EXPLORER_ADDRESS_URL(sweepTo)}
              target="_blank"
              rel="noreferrer"
            >
              view balance ↗
            </a>
          </div>
          <input
            value={sweepTo}
            onChange={(e) => setSweepTo(e.target.value)}
            placeholder="Treasury address (0x…)"
          />
          <button
            className="secondary"
            disabled={busy !== null || !surplus || Number(surplus) <= 0}
            onClick={() => setShowStepUp(true)}
          >
            {busy === "sweep" ? "Sweeping…" : "Sweep revenue → treasury"}
          </button>
          <p className="hint">
            Player funds stay locked in the contract — the owner can only sweep{" "}
            <strong>realized revenue</strong>. In production this treasury is a
            Fireblocks-secured wallet (MPC + policy).
          </p>
        </div>
      )}

      {showStepUp && (
        <StepUpModal
          action="revenue sweep"
          detail={`Sweep ${surplus ? Number(surplus).toFixed(5) : "0"} ETH → ${short(sweepTo)} (treasury)`}
          onConfirm={() => void doSweep()}
          onClose={() => setShowStepUp(false)}
        />
      )}
    </div>
  );
}
