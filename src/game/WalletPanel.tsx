import { useEffect, useState } from "react";
import { parseEther } from "viem";
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
    withdraw,
    readOwner,
    readVaultTotal,
    sweep,
    busy,
  } = useEvmMoney(walletAccount, client);
  const { vaultAddress, setVaultAddress, isShared } = useVaultAddress();
  const { credits, withdrawableCredits, addDepositCredits, withdrawCredits } =
    useGame();

  const [amount, setAmount] = useState(DEPOSIT_PRESETS[0]);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Operator (owner-only) state.
  const [isOwner, setIsOwner] = useState(false);
  const [vaultTotal, setVaultTotal] = useState<string | null>(null);
  const [sweepTo, setSweepTo] = useState<string>(address);
  const [showStepUp, setShowStepUp] = useState(false);

  useEffect(() => {
    if (!vaultAddress) return;
    let ok = true;
    void (async () => {
      try {
        const owner = await readOwner(vaultAddress);
        if (ok) setIsOwner(owner.toLowerCase() === address.toLowerCase());
        const total = await readVaultTotal(vaultAddress);
        if (ok) setVaultTotal(total);
      } catch {
        /* vault not reachable */
      }
    })();
    return () => {
      ok = false;
    };
  }, [vaultAddress, address, readOwner, readVaultTotal, lastTx]);

  async function doSweep() {
    setShowStepUp(false);
    setError(null);
    if (!vaultAddress || !vaultTotal) return;
    try {
      const amountWei = parseEther(vaultTotal);
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
      const amountWei = BigInt(withdrawableCredits) * WEI_PER_CREDIT;
      const hash = await withdraw(amountWei, vaultAddress);
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

      {/* Owner-only operator controls — sweep the vault treasury. */}
      {isOwner && (
        <div className="operator">
          <div className="row">
            <span className="net-badge">🛠 Operator</span>
            <span className="label">
              Vault holds {vaultTotal ? `${Number(vaultTotal).toFixed(5)} ETH` : "…"}
            </span>
          </div>
          <input
            value={sweepTo}
            onChange={(e) => setSweepTo(e.target.value)}
            placeholder="Sweep to address (0x…)"
          />
          <button
            className="secondary"
            disabled={busy !== null || !vaultTotal || Number(vaultTotal) <= 0}
            onClick={() => setShowStepUp(true)}
          >
            {busy === "sweep" ? "Sweeping…" : "Sweep vault → address"}
          </button>
          <p className="hint">
            Owner-only, and gated by step-up verification. In production this key
            lives in Fireblocks (MPC + policy).
          </p>
        </div>
      )}

      {showStepUp && (
        <StepUpModal
          action="sweep vault"
          onVerified={() => void doSweep()}
          onClose={() => setShowStepUp(false)}
        />
      )}
    </div>
  );
}
