import fs from "fs";
import path from "path";
import { Logger } from "./logger";

const log = new Logger("Validators");

export interface InputConfig {
startUrls: string[];
maxPages?: number;
maxReviewsPerPage?: number;
outputFile?: string;
}

export function validateConfig(raw: unknown): InputConfig {
if (typeof raw !== "object" || raw === null) {
throw new Error("Input configuration must be a JSON object.");
}

const obj = raw as Record<string, unknown>;
const startUrls = obj.startUrls;

if (!Array.isArray(startUrls) || startUrls.length === 0) {
throw new Error(
"Input configuration must include a non-empty 'startUrls' array."
);
}

const urlStrings: string[] = [];
for (const url of startUrls) {
if (typeof url !== "string" || !url.startsWith("http")) {
throw new Error(
`Invalid start URL detected. Each entry must be an HTTP/HTTPS URL string. Value: ${String(
url
)}`
);
}
urlStrings.push(url);
}

const maxPagesRaw = obj.maxPages;
const maxReviewsRaw = obj.maxReviewsPerPage;

const config: InputConfig = {
startUrls: urlStrings,
};

if (typeof maxPagesRaw === "number") {
if (!Number.isInteger(maxPagesRaw) || maxPagesRaw <= 0) {
throw new Error("'maxPages' must be a positive integer if provided.");
}
config.maxPages = maxPagesRaw;
}

if (typeof maxReviewsRaw === "number") {
if (!Number.isInteger(maxReviewsRaw) || maxReviewsRaw <= 0) {
throw new Error(
"'maxReviewsPerPage' must be a positive integer if provided."
);
}
config.maxReviewsPerPage = maxReviewsRaw;
}

if (typeof obj.outputFile === "string" && obj.outputFile.trim() !== "") {
config.outputFile = obj.outputFile.trim();
}

return config;
}

export function loadInputConfig(relativePath: string): InputConfig {
const resolved = path.resolve(process.cwd(), relativePath);
log.info(`Loading input configuration from ${resolved}`);
if (!fs.existsSync(resolved)) {
throw new Error(`Input configuration file not found: ${resolved}`);
}

const rawContent = fs.readFileSync(resolved, "utf8");
let parsed: unknown;
try {
parsed = JSON.parse(rawContent);
} catch (err) {
log.error("Failed to parse JSON input configuration.", err);
throw new Error(
`Invalid JSON in input configuration file: ${(err as Error).message}`
);
}

const validated = validateConfig(parsed);
log.debug("Validated input configuration", validated);
return validated;
}