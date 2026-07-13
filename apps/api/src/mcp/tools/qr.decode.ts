import { Jimp } from "jimp";
import jsQR from "jsqr";
import { sha256Hex } from "@/utils/hash";
import type { McpTool } from "../types";

const DECODABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface QrDecodeInput {
  fileBuffer: Buffer;
  mimetype: string;
}

export interface QrDecodeOutput {
  decoded: boolean;
  qrHash: string;
}

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

/** Real: an actual QR decode (jimp + jsqr), hashing whatever it finds (or the raw bytes if none). */
export const qrDecodeTool: McpTool<QrDecodeInput, QrDecodeOutput> = {
  name: "qr.decode",
  config: { timeoutMs: 3_000, retries: 1, cacheTtlMs: null },
  async run({ fileBuffer, mimetype }) {
    const decodedPayload = await tryDecodeQr(fileBuffer, mimetype);
    return { decoded: decodedPayload !== null, qrHash: sha256Hex(decodedPayload ?? fileBuffer) };
  },
  async fallback({ fileBuffer }) {
    return { decoded: false, qrHash: sha256Hex(fileBuffer) };
  },
};
