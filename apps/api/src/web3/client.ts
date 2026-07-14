import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { INJECTIVE_EVM_TESTNET, INJECTIVE_TESTNET_GAS_LIMIT, INJECTIVE_TESTNET_GAS_PRICE } from "@fanpass/shared";
import { env } from "@/config/env";

/**
 * The ONLY module allowed to hold viem clients / talk to Injective EVM Testnet — see
 * docs/ARCHITECTURE.md §1. Hardened per docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md's deployment notes:
 * this RPC never responds to eth_maxPriorityFeePerGas (hangs indefinitely) and serves
 * eth_getTransactionReceipt inconsistently (a load-balanced backend with no session affinity). So every
 * transaction here uses an explicit legacy gasPrice (never EIP-1559 estimation), and confirmation is
 * "poll the sender's nonce past this tx's nonce", not "wait for a receipt" — the same approach
 * apps/contracts/scripts/manual-deploy.ts arrived at empirically.
 */
export const injectiveEvmTestnet = defineChain({
  id: INJECTIVE_EVM_TESTNET.id,
  name: INJECTIVE_EVM_TESTNET.name,
  nativeCurrency: INJECTIVE_EVM_TESTNET.nativeCurrency,
  rpcUrls: { default: { http: [env.web3.rpcUrl] } },
  blockExplorers: { default: { name: "Blockscout", url: INJECTIVE_EVM_TESTNET.blockExplorerUrl } },
  testnet: true,
});

const CALL_TIMEOUT_MS = 20_000;

export const GAS_PRICE = INJECTIVE_TESTNET_GAS_PRICE;
export const GAS_LIMIT = INJECTIVE_TESTNET_GAS_LIMIT;

const transport = http(env.web3.rpcUrl, { timeout: CALL_TIMEOUT_MS, retryCount: 2, retryDelay: 1000 });

export const publicClient = createPublicClient({ chain: injectiveEvmTestnet, transport });

let trustEngineWalletClient: ReturnType<typeof createWalletClient> | undefined;
let trustEngineAddress: Address | undefined;

function getWallet() {
  if (!env.web3.trustEngineSignerPrivateKey) {
    throw new Error("TRUST_ENGINE_SIGNER_PRIVATE_KEY is not configured (apps/api/.env).");
  }
  if (!trustEngineWalletClient) {
    const account = privateKeyToAccount(env.web3.trustEngineSignerPrivateKey as `0x${string}`);
    trustEngineAddress = account.address;
    trustEngineWalletClient = createWalletClient({ account, chain: injectiveEvmTestnet, transport });
  }
  return { client: trustEngineWalletClient, address: trustEngineAddress! };
}

export function getTrustEngineAddress(): Address {
  return getWallet().address;
}

const NONCE_POLL_INTERVAL_MS = 3_000;
const NONCE_POLL_ATTEMPTS = 60; // 3 minutes

/** Confirms a transaction by polling the sender's on-chain nonce rather than fetching its receipt. */
export async function waitForNonceToPass(address: Address, txNonce: number): Promise<void> {
  for (let attempt = 1; attempt <= NONCE_POLL_ATTEMPTS; attempt++) {
    try {
      const confirmed = await publicClient.getTransactionCount({ address, blockTag: "latest" });
      if (confirmed > txNonce) return;
    } catch (error) {
      console.log(`  nonce poll ${attempt}/${NONCE_POLL_ATTEMPTS} error: ${(error as Error).message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, NONCE_POLL_INTERVAL_MS));
  }
  throw new Error(`Nonce ${txNonce} for ${address} never confirmed after ${NONCE_POLL_ATTEMPTS} polls.`);
}

/**
 * Sends a contract write signed by the Trust Engine's own signer (VERIFIER_ROLE / VENUE_VERIFIER_ROLE
 * actions only — never a user's marketplace transaction) and waits for on-chain confirmation.
 */
export async function sendTrustEngineTransaction(params: {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
}): Promise<{ txHash: `0x${string}`; nonce: number }> {
  const { client, address: from } = getWallet();
  const nonce = await publicClient.getTransactionCount({ address: from, blockTag: "pending" });

  const txHash = await client.writeContract({
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
    chain: injectiveEvmTestnet,
    account: client.account!,
    gasPrice: GAS_PRICE,
    gas: GAS_LIMIT,
    nonce,
  } as never);

  await waitForNonceToPass(from, nonce);
  return { txHash, nonce };
}
