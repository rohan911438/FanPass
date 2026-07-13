import { ownershipRegistryAbi } from "@fanpass/shared";
import { env } from "@/config/env";
import { publicClient, sendTrustEngineTransaction } from "./client";

const ADDRESS = env.web3.ownershipRegistryAddress;

/** Mints the Ownership Certificate on-chain — VERIFIER_ROLE, the Trust Engine's own attestation. */
export async function registerTicketOnChain(params: {
  ticketKey: `0x${string}`;
  owner: `0x${string}`;
  verificationHash: `0x${string}`;
  metadataHash: `0x${string}`;
  qrHash: `0x${string}`;
}): Promise<{ tokenId: bigint; txHash: `0x${string}` }> {
  const { txHash } = await sendTrustEngineTransaction({
    address: ADDRESS,
    abi: ownershipRegistryAbi,
    functionName: "registerTicket",
    args: [params.ticketKey, params.owner, params.verificationHash, params.metadataHash, params.qrHash],
  });

  const tokenId = await publicClient.readContract({
    address: ADDRESS,
    abi: ownershipRegistryAbi,
    functionName: "tokenIdFor",
    args: [params.ticketKey],
  });

  return { tokenId: tokenId as bigint, txHash };
}

export async function getTicketStatusOnChain(tokenId: bigint): Promise<number> {
  const status = await publicClient.readContract({
    address: ADDRESS,
    abi: ownershipRegistryAbi,
    functionName: "statusOf",
    args: [tokenId],
  });
  return status as number;
}

export async function getOwnerOnChain(tokenId: bigint): Promise<`0x${string}`> {
  const owner = await publicClient.readContract({
    address: ADDRESS,
    abi: ownershipRegistryAbi,
    functionName: "ownerOf",
    args: [tokenId],
  });
  return owner as `0x${string}`;
}
