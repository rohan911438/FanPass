import { findFixture, type Fixture } from "@/ai/fixtures";
import type { McpTool } from "../types";

export interface MetadataLookupInput {
  eventName: string;
  venue: string;
  eventDate: string;
}

export interface MetadataLookupOutput {
  fixture: Fixture | null;
}

/** Real: a pure lookup against the known-fixtures comps table. */
export const metadataLookupTool: McpTool<MetadataLookupInput, MetadataLookupOutput> = {
  name: "metadata.lookup",
  config: { timeoutMs: 1_000, retries: 0, cacheTtlMs: 60_000 },
  async run({ eventName, venue, eventDate }) {
    return { fixture: findFixture(eventName, venue, eventDate) };
  },
};
