import fs from "fs";
import path from "path";
import { Logger } from "../utils/logger";
import { ReviewRecord } from "../crawler/yelp_parser";

const log = new Logger("DatasetHandler");

export interface SaveOptions {
outputFile?: string;
}

/**
* Ensures that the directory for the given file path exists.
*/
function ensureDirectoryForFile(filePath: string): void {
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) {
fs.mkdirSync(dir, { recursive: true });
}
}

/**
* Saves review records into a JSON file.
*/
export function saveReviewsToDataset(
reviews: ReviewRecord[],
options: SaveOptions = {}
): string {
if (reviews.length === 0) {
log.warn("No reviews to write. Skipping file creation.");
return "";
}

const baseDir = path.resolve(process.cwd(), "data");
const fileName =
options.outputFile && options.outputFile.trim() !== ""
? options.outputFile.trim()
: `yelp-reviews-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

const outputPath = path.isAbsolute(fileName)
? fileName
: path.join(baseDir, fileName);

ensureDirectoryForFile(outputPath);

const payload = JSON.stringify(reviews, null, 2);

fs.writeFileSync(outputPath, payload, "utf8");
log.info(`Saved ${reviews.length} reviews to dataset file: ${outputPath}`);

return outputPath;
}