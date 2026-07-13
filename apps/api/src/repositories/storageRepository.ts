import { getBucket } from "@/config/firebaseAdmin";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Uploads the original ticket file and returns a long-lived signed read URL — the "Storage-signed-URL flow". */
export async function uploadTicketFile(
  ticketId: string,
  buffer: Buffer,
  mimetype: string
): Promise<{ imageUrl: string; storagePath: string }> {
  const extension = EXTENSION_BY_MIME[mimetype] ?? "bin";
  const storagePath = `tickets/${ticketId}/original.${extension}`;
  const file = getBucket().file(storagePath);

  await file.save(buffer, { metadata: { contentType: mimetype } });
  const [imageUrl] = await file.getSignedUrl({ action: "read", expires: "01-01-2500" });

  return { imageUrl, storagePath };
}
