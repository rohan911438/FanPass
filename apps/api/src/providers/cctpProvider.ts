import { env } from "@/config/env";
import { liveCctpProvider } from "./liveCctpProvider";
import { simulatedCctpProvider } from "./simulatedCctpProvider";

export interface AttestationStatus {
  status: "pending" | "complete";
  attestation: string | null;
  messageHash: string;
}

export interface CctpProvider {
  /** Derives a message hash for a confirmed burn tx (in live mode, parsed from its DepositForBurn log). */
  deriveMessageHash(burnTxHash: string, sourceDomain: number): Promise<string>;
  /** Polls Circle's attestation service for a given message hash. */
  fetchAttestation(messageHash: string): Promise<AttestationStatus>;
  /** The permissionless MessageTransmitter.receiveMessage step — mints USDC on the destination chain. */
  receiveMessage(messageHash: string, attestation: string): Promise<`0x${string}`>;
}

/**
 * Simulated by default (deterministic, no external account needed) — matches this repo's existing
 * "mocked-but-deterministic now, real vendor later behind the same signature" convention (see
 * apps/api/src/ai/README.md). Set CCTP_LIVE=true once real Circle credentials + Injective domain id are
 * configured; every caller goes through this one seam either way.
 */
export const cctpProvider: CctpProvider = env.cctp.live ? liveCctpProvider : simulatedCctpProvider;
