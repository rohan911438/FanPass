import type { Request, Response } from "express";
import type { TicketUploadInput } from "@fanpass/shared";
import { ApiError } from "@/middleware/errorHandler";
import { getTicket, getVerificationProgress, uploadTicket } from "@/services/ticketService";
import { asyncHandler } from "@/utils/asyncHandler";

export const postTicket = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "Missing ticketFile upload.");
  }
  const ticket = await uploadTicket(req.body as TicketUploadInput, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });
  res.status(201).json(ticket);
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await getTicket(req.params.id);
  res.json(ticket);
});

export const getTicketVerification = asyncHandler(async (req: Request, res: Response) => {
  const progress = await getVerificationProgress(req.params.id);
  res.json(progress);
});
