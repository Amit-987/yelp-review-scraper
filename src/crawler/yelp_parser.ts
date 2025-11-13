import { CheerioAPI } from "cheerio";
import { Logger } from "../utils/logger";

const log = new Logger("YelpParser");

export interface ReviewRecord {
reviewerName: string;
rating: number;
date: string;
reviewText: string;
reviewUrl: string;
businessName: string;
businessUrl: string;
}

/**
* Attempts to extract the Yelp business name from the page.
*/
function extractBusinessName($: CheerioAPI): string {
// Newer Yelp layouts use an h1 for the business name
const h1 = $("h1").first().text().trim();
if (h1) return h1;

// Fallbacks for older or alternative layouts
const businessMeta =
$('meta[property="og:title"]').attr("content") ||
$('meta[name="og:title"]').attr("content");
if (businessMeta) return businessMeta.trim();

return "Unknown Business";
}

/**
* Attempts to extract the canonical business URL from the page.
*/
function extractBusinessUrl($: CheerioAPI, pageUrl: string): string {
const canonical =
$('link[rel="canonical"]').attr("href") ||
$('meta[property="og:url"]').attr("content");
if (canonical) {
return canonical.split("?")[0];
}
return pageUrl.split("?")[0];
}

/**
* Extracts reviews from a Yelp business page.
* The DOM on Yelp changes occasionally, so this parser uses multiple selectors
* and fallbacks to remain resilient.
*/
export function parseReviewsFromPage(
$: CheerioAPI,
pageUrl: string
): ReviewRecord[] {
const businessName = extractBusinessName($);
const businessUrl = extractBusinessUrl($, pageUrl);

const reviews: ReviewRecord[] = [];

// Candidate containers for individual reviews.
const reviewContainers = $(
[
"[data-review-id]",
"[itemprop='review']",
"li.review__373c0__13kpL",
"div.review__373c0__13kpL",
"div[data-testid='review-card']",
].join(",")
);

if (reviewContainers.length === 0) {
log.warn("No review containers matched on page. Selectors may be outdated.");
}

reviewContainers.each((_, elem) => {
const container = $(elem);

// Reviewer name
const nameSelectors = [
"a[href*='/user_details?']",
"[itemprop='author'] span",
"span.fs-block",
"span[class*='user-name'], span[class*='UserDisplayName']",
].join(",");

const reviewerName =
container.find(nameSelectors).first().text().trim() ||
container
.find("a")
.filter((_, a) =>
($(a).attr("href") || "").includes("/user_details?")
)
.first()
.text()
.trim() ||
"Anonymous";

// Rating (Yelp uses aria-label like "5 star rating")
let rating = 0;
const ratingNode =
container.find("[aria-label*='star rating']").first() ||
container.find("div[role='img'][aria-label*='star rating']").first() ||
container.find("div[aria-label*='star rating']").first();

const ratingLabel =
ratingNode.attr("aria-label") || ratingNode.attr("title") || "";
const ratingMatch = ratingLabel.match(/([0-9.]+)\s*star/i);
if (ratingMatch) {
rating = parseFloat(ratingMatch[1]);
}

// Date
const dateSelectors = [
"span.css-chan6m", // common Yelp date class
"span[itemprop='datePublished']",
"span[class*='css-'] time",
"time",
].join(",");

const dateText =
container.find(dateSelectors).first().text().trim() ||
container.find("time").first().attr("datetime") ||
"";

// Review text
const textSelectors = [
"span[class*='raw__'], p[class*='comment'], p.comment__373c0__",
"[itemprop='reviewBody']",
"p",
].join(",");

let reviewText = "";
const textNode = container.find(textSelectors).first();
if (textNode.length > 0) {
reviewText = textNode.text().trim();
}

if (!reviewText) {
// Fallback: concatenate all paragraphs inside the container
reviewText = container
.find("p")
.map((_, p) => $(p).text().trim())
.get()
.join(" ")
.trim();
}

// Construct a synthetic review URL using the page URL plus fragment
const reviewId =
container.attr("data-review-id") ||
container.attr("data-testid") ||
undefined;

const reviewUrl = reviewId
? `${businessUrl}#review_${reviewId}`
: pageUrl.split("?")[0];

if (!reviewText && rating === 0) {
// Skip obviously empty entries
return;
}

const record: ReviewRecord = {
reviewerName: reviewerName || "Anonymous",
rating,
date: dateText || "",
reviewText,
reviewUrl,
businessName,
businessUrl,
};

reviews.push(record);
});

log.info(`Parsed ${reviews.length} reviews from page ${pageUrl}`);
return reviews;
}

/**
* Attempts to find the "next page" URL in Yelp pagination.
*/
export function findNextPageUrl($: CheerioAPI, currentUrl: string): string | null {
// Yelp commonly uses "Next" pagination links
const nextLink =
$("a.next-link, a[rel='next']").first() ||
$("a").filter((_, a) => $(a).text().trim().toLowerCase() === "next").first();

const href = nextLink.attr("href");
if (!href) {
return null;
}

if (href.startsWith("http")) {
return href;
}

// Relative link
try {
const urlObj = new URL(currentUrl);
if (href.startsWith("/")) {
return `${urlObj.origin}${href}`;
}
const basePath = urlObj.pathname.endsWith("/")
? urlObj.pathname
: `${urlObj.pathname}/`;
return `${urlObj.origin}${basePath}${href}`;
} catch (err) {
log.warn("Failed to resolve next page URL. Returning null.", err);
return null;
}
}