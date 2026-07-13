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

const API_BASE = "http://localhost:4000/api/v1";
const USDC_DECIMALS = 6;

async function api(path: string, init?: RequestInit, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, init);
      const text = await res.text();
      const body = text ? JSON.parse(text) : undefined;
      if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
      return body;
    } catch (error) {
      const isConnError = error instanceof Error && /ECONNREFUSED|fetch failed/.test(error.message);
      if (!isConnError || attempt === retries) throw error;
      console.log(`  (retry ${attempt}/${retries} after connection error on ${path})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
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
  // The Fraud Agent's tamperScore is a deterministic hash of the exact file bytes — with unique bytes
  // per attempt, that's effectively a fresh probabilistic roll each time (same as real uploads legitimately
  // vary pass/fail). This loop reflects a user retrying with a different photo, not gaming the heuristic:
  // it isn't this smoke test's job to stress-test the mock scorer's threshold, only the marketplace flow
  // downstream of a passing verification.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ticket: any;
  for (let attempt = 1; attempt <= 5 && ticket?.status !== "verified"; attempt++) {
    const fakeTicket = new Blob([Buffer.from(`PNG-FAKE-TICKET-BYTES-FOR-SMOKE-TEST-${Date.now()}-${attempt}`)], {
      type: "image/png",
    });
    // Matches a known fixture exactly (apps/api/src/ai/fixtures.ts) so Metadata/Pricing clear the bar
    // deterministically — the QR Agent still can't decode a real code from these fake bytes (expected,
    // same -15 any genuine ticket photo without a legible code would take).
    const form = new FormData();
    form.append("eventName", "World Cup 2026 — Group Stage, Match 30");
    form.append("eventDate", "2026-06-19T00:00:00.000Z"); // ticketUploadSchema requires a full ISO datetime
    form.append("venue", "SoFi Stadium, Inglewood");
    form.append("seatInfo", "Sec 114, Row 12, Seat 8");
    form.append("sellerAddress", seller.address);
    form.append("ticketFile", fakeTicket, "ticket.png");

    const created = await api("/tickets", { method: "POST", body: form as never });
    console.log(`  attempt ${attempt}: ticket created:`, created.ticketId, "status:", created.status);

    console.log("\n[4] Polling verification progress...");
    ticket = created;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      ticket = await api(`/tickets/${created.ticketId}`);
      const progress = await api(`/tickets/${created.ticketId}/verification`);
      console.log(`  [${i}] status=${ticket.status} stage=${progress.stage} completedStages=${JSON.stringify(progress.completedStages)} flags=${JSON.stringify(progress.flags)}`);
      if (ticket.status === "verified" || ticket.status === "rejected") break;
    }
  }

  if (!ticket || ticket.status !== "verified") {
    throw new Error(`Ticket did not verify after 5 attempts: final status=${ticket?.status}`);
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
