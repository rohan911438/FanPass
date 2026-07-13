import { Jimp } from "jimp";
import jsQR from "jsqr";
import type { AgentResult, QrAgentOutput } from "@fanpass/shared";
import { findTicketByQrHash } from "@/repositories/ticketRepository";
import type { QrAgentInput } from "@/types/agentInputs";
import { sha256Hex } from "@/utils/hash";

const DECODABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function tryDecodeQr(fileBuffer: Buffer, mimetype: string): Promise<string | null> {
  if (!DECODABLE_IMAGE_TYPES.has(mimetype)) return null;
  try {
    const image = await Jimp.read(fileBuffer);
    const { data, width, height } = image.bitmap;
    const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
    const result = jsQR(rgba, width, height);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Real agent: attempts an actual QR decode (jimp + jsqr) on the uploaded image, hashes whatever it
 * finds (or falls back to hashing the raw file if no QR is detected — e.g. a PDF, or a photo where the
 * code isn't legible), then runs a real Firestore duplicate-registry lookup against other tickets.
 */
export async function runQrAgent(input: QrAgentInput): Promise<AgentResult<QrAgentOutput>> {
  const start = Date.now();
  const decodedPayload = await tryDecodeQr(input.fileBuffer, input.mimetype);
  const decoded = decodedPayload !== null;
  const qrHash = sha256Hex(decodedPayload ?? input.fileBuffer);

  const duplicate = await findTicketByQrHash(qrHash, input.ticketId);

  const output: QrAgentOutput = {
    decoded,
    qrHash,
    duplicateFound: duplicate !== null,
    duplicateOfTicketId: duplicate?.ticketId ?? null,
  };

  const flags: string[] = [];
  if (!decoded) flags.push("qr_not_detected");
  if (duplicate) flags.push("duplicate_qr_hash");

  return {
    agent: "qr",
    confidence: decoded ? (duplicate ? 0.5 : 0.97) : 0.55,
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
