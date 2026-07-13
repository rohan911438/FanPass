import multer from "multer";
import { ApiError } from "@/middleware/errorHandler";

const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const storage = multer.memoryStorage();

/** Single ticket file (photo/PDF/QR) uploaded under the "ticketFile" field of the multipart form. */
export const ticketFileUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Use JPEG, PNG, WebP, or PDF.`));
      return;
    }
    cb(null, true);
  },
}).single("ticketFile");
