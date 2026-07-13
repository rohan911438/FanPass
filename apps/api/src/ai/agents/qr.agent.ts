import type { AgentResult, QrAgentOutput } from "@fanpass/shared";
import { callTool } from "@/mcp/server";
import type { QrDecodeInput, QrDecodeOutput } from "@/mcp/tools/qr.decode";
import { findTicketByQrHash } from "@/repositories/ticketRepository";
import type { QrAgentInput } from "@/types/agentInputs";

/**
 * Calls the qr.decode MCP tool (real: jimp + jsqr) for the decode+hash, then runs the real Firestore
 * duplicate-registry lookup, which stays here since it's a repository concern, not an external capability.
 */
export async function runQrAgent(input: QrAgentInput): Promise<AgentResult<QrAgentOutput>> {
  const start = Date.now();

  const toolResult = await callTool<QrDecodeInput, QrDecodeOutput>(
    "qr.decode",
    { fileBuffer: input.fileBuffer, mimetype: input.mimetype },
    input.ticketId
  );
  const decoded = toolResult.output?.decoded ?? false;
  const qrHash = toolResult.output?.qrHash ?? "";

  const duplicate = qrHash ? await findTicketByQrHash(qrHash, input.ticketId) : null;

  const output: QrAgentOutput = {
    decoded,
    qrHash,
    duplicateFound: duplicate !== null,
    duplicateOfTicketId: duplicate?.ticketId ?? null,
  };

  const flags: string[] = [];
  if (!decoded) flags.push("qr_not_detected");
  if (duplicate) flags.push("duplicate_qr_hash");
  if (!toolResult.ok) flags.push("qr_decode_tool_unavailable");

  return {
    agent: "qr",
    confidence: decoded ? (duplicate ? 0.5 : 0.97) : 0.55,
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
