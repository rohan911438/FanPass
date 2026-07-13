import { Router } from "express";
import { ticketUploadSchema } from "@fanpass/shared";
import { getTicketById, getTicketVerification, postTicket } from "@/controllers/tickets.controller";
import { ticketFileUpload } from "@/middleware/upload";
import { validate } from "@/validators/validate";

export const ticketsRouter = Router();

ticketsRouter.post("/", ticketFileUpload, validate(ticketUploadSchema), postTicket);
ticketsRouter.get("/:id", getTicketById);
ticketsRouter.get("/:id/verification", getTicketVerification);
