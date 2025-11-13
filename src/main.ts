import { loadInputConfig, InputConfig } from "./utils/validators";
import { logger } from "./utils/logger";
import { loadCheerioDocument } from "./crawler/cheerio_loader";
import {
parseReviewsFromPage,
findNextPageUrl,
ReviewRecord,
} from "./crawler/yelp_parser";
import { saveReviewsToDataset } from "./outputs/dataset_handler";

async function scrapeBusiness(
startUrl: string,
config: InputConfig
): Promise<ReviewRecord[]> {
const allReviews: ReviewRecord[] = [];
let currentUrl: string | null = startUrl;
let page = 0;
const maxPages = config.maxPages ?? 3;

while (currentUrl && page < maxPages) {
page += 1;
logger.info(`Scraping page ${page} for business: ${currentUrl}`);

try {
const { $, url } = await loadCheerioDocument(currentUrl);
const pageReviews = parseReviewsFromPage($, url);

const limitedReviews =
typeof config.maxReviewsPerPage === "number"
? pageReviews.slice(0, config.maxReviewsPerPage)
: pageReviews;

allReviews.push(...limitedReviews);

const nextUrl = findNextPageUrl($, url);
if (!nextUrl) {
logger.info(
`No next page found for ${url}. Stopping at page ${page}.`
);
break;
}

currentUrl = nextUrl;
} catch (error) {
logger.error(
`Error while scraping URL ${currentUrl}. Stopping pagination for this business.`,
error
);
break;
}
}

return allReviews;
}

async function run(): Promise<void> {
try {
const inputPath =
process.argv[2] || "data/sample-input.json";

const config = loadInputConfig(inputPath);
const allReviews: ReviewRecord[] = [];

for (const url of config.startUrls) {
const reviewsForBusiness = await scrapeBusiness(url, config);
allReviews.push(...reviewsForBusiness);
}

if (allReviews.length === 0) {
logger.warn("No reviews were scraped from the provided URLs.");
return;
}

const outputPath = saveReviewsToDataset(allReviews, {
outputFile: config.outputFile,
});

if (outputPath) {
logger.info(`Scraping complete. Output saved to: ${outputPath}`);
} else {
logger.warn("Scraping finished, but no dataset file was created.");
}
} catch (error) {
logger.error("Fatal error in Yelp Review Scraper run().", error);
process.exitCode = 1;
}
}

run().catch((err) => {
logger.error("Unhandled exception in main run()", err);
process.exitCode = 1;
});