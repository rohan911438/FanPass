import { z } from "zod";

/** The wallet-as-identity check, reused everywhere a payload carries an address. */
export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM wallet address");
