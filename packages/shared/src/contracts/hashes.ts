import { keccak256, toBytes } from "viem";

/**
 * OwnershipRegistry derives tokenId = uint256(ticketKey) where ticketKey = keccak256(ticketId) — see
 * docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §3.2. Pure and deterministic: both frontend and backend must
 * compute the exact same value from a ticket's off-chain id, without a network round-trip.
 */
export function ticketIdToTicketKey(ticketId: string): `0x${string}` {
  return keccak256(toBytes(ticketId));
}

export function ticketIdToTokenId(ticketId: string): bigint {
  return BigInt(ticketIdToTicketKey(ticketId));
}

/** Tamper-evidence hash anchored on-chain at mint time — the event/venue/date/seat, never stored raw. */
export function hashTicketMetadata(metadata: { eventName: string; venue: string; eventDate: string; seatInfo?: string }): `0x${string}` {
  return keccak256(toBytes(JSON.stringify(metadata)));
}

/** Anchors that the off-chain verification report hasn't been quietly edited — the report itself never goes on-chain. */
export function hashVerificationReport(agentResults: unknown): `0x${string}` {
  return keccak256(toBytes(JSON.stringify(agentResults)));
}

/** A sha256 hex digest is already 32 bytes — just normalize the "0x" prefix, no re-encoding needed. */
export function sha256HexToBytes32(sha256Hex: string): `0x${string}` {
  return (sha256Hex.startsWith("0x") ? sha256Hex : `0x${sha256Hex}`) as `0x${string}`;
}
