import type { OcrAgentOutput, WalletAddress } from "@fanpass/shared";

export interface ClaimedTicketFields {
  eventName: string;
  eventDate: string;
  venue: string;
  seatInfo?: string;
}

export interface OcrAgentInput {
  claimed: ClaimedTicketFields;
}

export interface MetadataAgentInput {
  claimed: ClaimedTicketFields;
  ocr: OcrAgentOutput;
}

export interface FraudAgentInput {
  fileBuffer: Buffer;
  mimetype: string;
}

export interface QrAgentInput {
  ticketId: string;
  fileBuffer: Buffer;
  mimetype: string;
}

export interface OwnershipAgentInput {
  ticketId: string;
  claimedSeller: WalletAddress;
  duplicateOfTicketId: string | null;
}

export interface PricingAgentInput {
  eventName: string;
  venue: string;
}
