import { sha256Hex } from "@/utils/hash";
import type { CctpProvider } from "./cctpProvider";

/** Testnet-speed simulated attestation delay — long enough to show the multi-step progress UI honestly. */
const SIMULATED_ATTESTATION_DELAY_MS = 15_000;

const attestationStartedAt = new Map<string, number>();

export const simulatedCctpProvider: CctpProvider = {
  async deriveMessageHash(burnTxHash, sourceDomain) {
    return sha256Hex(`${burnTxHash}:${sourceDomain}`);
  },

  async fetchAttestation(messageHash) {
    const startedAt = attestationStartedAt.get(messageHash) ?? Date.now();
    attestationStartedAt.set(messageHash, startedAt);

    if (Date.now() - startedAt < SIMULATED_ATTESTATION_DELAY_MS) {
      return { status: "pending", attestation: null, messageHash };
    }
    return { status: "complete", attestation: `simulated-attestation:${messageHash}`, messageHash };
  },

  async receiveMessage(messageHash) {
    return `0x${sha256Hex(`simulated-mint:${messageHash}`)}` as `0x${string}`;
  },
};
