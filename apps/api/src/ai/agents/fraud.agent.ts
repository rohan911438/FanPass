import type { AgentResult, FraudAgentOutput } from "@fanpass/shared";
import type { FraudAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

/**
 * Mocked but deterministic: seeded from the actual uploaded file bytes (a real sha256 hash), so the
 * same file always produces the same tamper/screenshot verdict. Real image-forensics model swaps in
 * later behind this same signature — see docs/ARCHITECTURE.md §6.
 */
export async function runFraudAgent(input: FraudAgentInput): Promise<AgentResult<FraudAgentOutput>> {
  const start = Date.now();
  const seed = sha256Hex(input.fileBuffer);
  const rand = seededRandom(`fraud:${seed}`);
  await delay(500 + Math.floor(rand() * 400));

  const tamperScore = Number((rand() * 0.5).toFixed(2)); // mock skews low; genuinely tampered demo files score higher below
  const screenshotDetected = input.mimetype !== "application/pdf" && rand() < 0.08;
  const editingArtifactsDetected = tamperScore > 0.35;

  const flags: string[] = [];
  if (screenshotDetected) flags.push("screenshot_detected");
  if (editingArtifactsDetected) flags.push("editing_artifacts_detected");

  const output: FraudAgentOutput = { tamperScore, screenshotDetected, editingArtifactsDetected };

  return {
    agent: "fraud",
    confidence: Number((1 - tamperScore).toFixed(2)),
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
