/**
 * One-off live smoke test against the deployed Injective EVM Testnet contracts.
 * Drives: verify (real registerTicket mint) -> list -> buy -> releaseEscrow -> sync,
 * using two throwaway/funded wallets to simulate "the connected wallet" signing its own txs.
 *
 * Run: npx tsx apps/api/scripts/smoke-test.ts   (from repo root, with apps/api dev server running on :4000)
 */
import "dotenv/config";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createWalletClient, http, parseEventLogs, formatUnits } from "viem";
import {
  escrowMarketplaceAbi,
  mockUsdcAbi,
  ownershipRegistryAbi,
  INJECTIVE_TESTNET_CONTRACTS,
} from "@fanpass/shared";
import { env } from "@/config/env";
import { injectiveEvmTestnet, publicClient, GAS_PRICE, GAS_LIMIT, waitForNonceToPass } from "@/web3/client";

const API_BASE = "http://localhost:4000";
const USDC_DECIMALS = 6;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function send(
  privateKey: `0x${string}`,
  address: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[]
) {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({ account, chain: injectiveEvmTestnet, transport: http(env.web3.rpcUrl) });
  const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
  const txHash = await client.writeContract({
    address,
    abi,
    functionName,
    args,
    chain: injectiveEvmTestnet,
    account,
    gasPrice: GAS_PRICE,
    gas: GAS_LIMIT,
    nonce,
  } as never);
  await waitForNonceToPass(account.address, nonce);
  return txHash as `0x${string}`;
}

async function sync(txHash: string) {
  return api("/marketplace/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });
}

async function main() {
  const deployerKey = env.web3.trustEngineSignerPrivateKey as `0x${string}`;
  const seller = privateKeyToAccount(deployerKey);
  const buyerKey = generatePrivateKey();
  const buyer = privateKeyToAccount(buyerKey);

  console.log("seller (deployer):", seller.address);
  console.log("buyer (fresh):    ", buyer.address);

  // --- fund buyer with gas ---
  console.log("\n[1] Funding buyer with INJ for gas...");
  {
    const client = createWalletClient({ account: seller, chain: injectiveEvmTestnet, transport: http(env.web3.rpcUrl) });
    const nonce = await publicClient.getTransactionCount({ address: seller.address, blockTag: "pending" });
    const txHash = await client.sendTransaction({
      to: buyer.address,
      value: 50_000_000_000_000_000n, // 0.05 INJ
      gasPrice: GAS_PRICE,
      gas: 21_000n,
      nonce,
      chain: injectiveEvmTestnet,
      account: seller,
    });
    await waitForNonceToPass(seller.address, nonce);
    console.log("  funded buyer, tx:", txHash);
  }

  // --- mint USDC to buyer (MockUSDC.mint has no access control) ---
  console.log("\n[2] Minting 500 test USDC to buyer...");
  const mintAmount = 500n * 10n ** BigInt(USDC_DECIMALS);
  const usdcAddress = INJECTIVE_TESTNET_CONTRACTS.usdc as `0x${string}`;
  await send(deployerKey, usdcAddress, mockUsdcAbi, "mint", [buyer.address, mintAmount]);
  const buyerBal = await publicClient.readContract({
    address: usdcAddress,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: [buyer.address],
  });
  console.log("  buyer USDC balance:", formatUnits(buyerBal as bigint, USDC_DECIMALS));

  // --- submit ticket for verification, seller = deployer address ---
  console.log("\n[3] Submitting ticket for verification (sellerAddress = seller)...");
  const fakeTicket = new Blob([Buffer.from("PNG-FAKE-TICKET-BYTES-FOR-SMOKE-TEST")], { type: "image/png" });
  const form = new FormData();
  form.append("eventName", "FIFA World Cup Final 2026");
  form.append("eventDate", new Date(Date.now() + 30 * 86400_000).toISOString());
  form.append("venue", "MetLife Stadium");
  form.append("seatInfo", "Sec 114, Row 12, Seat 8");
  form.append("sellerAddress", seller.address);
  form.append("ticketFile", fakeTicket, "ticket.png");

  const created = await api("/tickets", { method: "POST", body: form as never });
  console.log("  ticket created:", created.ticketId, "status:", created.status);

  console.log("\n[4] Polling verification progress...");
  let ticket = created;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    ticket = await api(`/tickets/${created.ticketId}`);
    const progress = await api(`/tickets/${created.ticketId}/verification`);
    console.log(`  [${i}] status=${ticket.status} stages=${JSON.stringify(progress.stages?.map((s: { stage: string; state: string }) => s.state))}`);
    if (ticket.status === "verified" || ticket.status === "rejected") break;
  }

  if (ticket.status !== "verified") {
    throw new Error(`Ticket did not verify: final status=${ticket.status}`);
  }
  console.log("  VERIFIED. tokenId =", ticket.tokenId);

  const onChainOwner = await publicClient.readContract({
    address: env.web3.ownershipRegistryAddress,
    abi: ownershipRegistryAbi,
    functionName: "ownerOf",
    args: [BigInt(ticket.tokenId)],
  });
  console.log("  on-chain ownerOf(tokenId) =", onChainOwner, onChainOwner.toLowerCase() === seller.address.toLowerCase() ? "MATCH" : "MISMATCH!");

  // --- seller creates listing on-chain, then backend syncs ---
  console.log("\n[5] Seller creates listing on-chain (price 100 USDC)...");
  const price = 100n * 10n ** BigInt(USDC_DECIMALS);
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
  const createListingTx = await send(deployerKey, env.web3.escrowMarketplaceAddress, escrowMarketplaceAbi, "createListing", [
    BigInt(ticket.tokenId),
    price,
    expiresAt,
  ]);
  console.log("  createListing tx:", createListingTx);
  const listingReceipt = await publicClient.getTransactionReceipt({ hash: createListingTx }).catch(() => null);
  let listingId: bigint | undefined;
  if (listingReceipt) {
    const events = parseEventLogs({ abi: escrowMarketplaceAbi, logs: listingReceipt.logs, eventName: "ListingCreated" });
    listingId = (events[0]?.args as { listingId?: bigint } | undefined)?.listingId;
  }
  console.log("  decoded listingId:", listingId);

  console.log("\n[6] Backend sync for createListing tx...");
  const syncResult1 = await sync(createListingTx);
  console.log("  sync result:", JSON.stringify(syncResult1));

  const listings = await api("/marketplace");
  console.log("  GET /marketplace ->", listings.length, "listing(s)");
  const myListing = listings.find((l: { txHash?: string; listingId: string }) => String(l.listingId) === String(listingId));
  console.log("  found listing in store:", myListing ? "YES" : "NO", myListing);

  // --- buyer approves + buys ---
  console.log("\n[7] Buyer approves USDC to EscrowMarketplace...");
  const approveTx = await send(buyerKey, usdcAddress, mockUsdcAbi, "approve", [env.web3.escrowMarketplaceAddress, price]);
  console.log("  approve tx:", approveTx);

  console.log("\n[8] Buyer calls buy(listingId, price)...");
  const buyTx = await send(buyerKey, env.web3.escrowMarketplaceAddress, escrowMarketplaceAbi, "buy", [listingId, price]);
  console.log("  buy tx:", buyTx);

  console.log("\n[9] Backend sync for buy tx...");
  const syncResult2 = await sync(buyTx);
  console.log("  sync result:", JSON.stringify(syncResult2));

  // --- buyer releases escrow ---
  console.log("\n[10] Buyer calls releaseEscrow(listingId)...");
  const releaseTx = await send(buyerKey, env.web3.escrowMarketplaceAddress, escrowMarketplaceAbi, "releaseEscrow", [listingId]);
  console.log("  releaseEscrow tx:", releaseTx);

  console.log("\n[11] Backend sync for releaseEscrow tx...");
  const syncResult3 = await sync(releaseTx);
  console.log("  sync result:", JSON.stringify(syncResult3));

  // --- final verification ---
  console.log("\n[12] Final on-chain check: ownerOf(tokenId) should now be buyer...");
  const finalOwner = await publicClient.readContract({
    address: env.web3.ownershipRegistryAddress,
    abi: ownershipRegistryAbi,
    functionName: "ownerOf",
    args: [BigInt(ticket.tokenId)],
  });
  console.log("  final owner:", finalOwner, finalOwner.toLowerCase() === buyer.address.toLowerCase() ? "MATCH (transfer confirmed)" : "MISMATCH!");

  const finalListing = await api(`/marketplace/${listingId}`);
  console.log("  final listing status in store:", finalListing.status);

  const finalTicket = await api(`/tickets/${created.ticketId}`);
  console.log("  final ticket status in store:", finalTicket.status);

  console.log("\n=== SMOKE TEST COMPLETE ===");
}

main().catch((err) => {
  console.error("\nSMOKE TEST FAILED:", err);
  process.exit(1);
});
