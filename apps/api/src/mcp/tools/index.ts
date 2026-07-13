import { registerTool } from "../server";
import { chainReadTool } from "./chain.read";
import { fraudDbLookupTool } from "./fraud.dbLookup";
import { imageForensicsTool } from "./image.forensics";
import { metadataLookupTool } from "./metadata.lookup";
import { ocrExtractTool } from "./ocr.extract";
import { priceHistoryTool } from "./price.history";
import { qrDecodeTool } from "./qr.decode";

registerTool(ocrExtractTool);
registerTool(qrDecodeTool);
registerTool(metadataLookupTool);
registerTool(chainReadTool);
registerTool(priceHistoryTool);
registerTool(fraudDbLookupTool);
registerTool(imageForensicsTool);
