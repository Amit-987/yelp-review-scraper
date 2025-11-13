import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { Logger } from "../utils/logger";

const log = new Logger("CheerioLoader");

export interface LoadedDocument {
$: cheerio.CheerioAPI;
url: string;
status: number;
}

/**
* Fetches the HTML of a Yelp page and returns a Cheerio document.
*/
export async function loadCheerioDocument(url: string): Promise<LoadedDocument> {
log.info(`Fetching URL: ${url}`);
try {
const response: AxiosResponse<string> = await axios.get(url, {
headers: {
"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
},
timeout: 30000,
maxRedirects: 5,
validateStatus: (status) => status >= 200 && status < 400,
});

const html = response.data;
const $ = cheerio.load(html);
log.debug(`Loaded HTML for URL: ${response.request?.res?.responseUrl || url}`);

return {
$,
url: response.request?.res?.responseUrl || url,
status: response.status,
};
} catch (error) {
log.error(`Failed to fetch URL: ${url}`, error);
throw new Error(
`Failed to load document for URL ${url}: ${(error as Error).message}`
);
}
}