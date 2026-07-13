import { env } from "@/config/env";
import type { CctpProvider } from "./cctpProvider";

const IRIS_API_BASE = "https://iris-api-sandbox.circle.com";

/**
 * Not implemented: wiring this up needs a chosen source chain's burn-log parser and Injective's real
 * CCTP MessageTransmitter address once CCTP_INJECTIVE_DOMAIN is configured (see
 * docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 1). Left as explicit failures rather than guessed contract
 * addresses/domain ids this codebase can't verify.
 */
export const liveCctpProvider: CctpProvider = {
  async deriveMessageHash() {
    throw new Error("liveCctpProvider.deriveMessageHash is not configured — see providers/liveCctpProvider.ts");
  },

  async fetchAttestation(messageHash) {
    const res = await fetch(`${IRIS_API_BASE}/attestations/${messageHash}`);
    if (!res.ok) throw new Error(`Circle attestation API returned ${res.status}`);
    const body = (await res.json()) as { status: string; attestation?: string };
    return {
      status: body.status === "complete" ? "complete" : "pending",
      attestation: body.attestation ?? null,
      messageHash,
    };
  },

  async receiveMessage() {
    if (env.cctp.injectiveDomain === null) {
      throw new Error("CCTP_INJECTIVE_DOMAIN is not set — cannot submit receiveMessage on Injective.");
    }
    throw new Error("liveCctpProvider.receiveMessage is not configured — see providers/liveCctpProvider.ts");
  },
};
