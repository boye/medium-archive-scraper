import fs from 'fs';
import logger from 'pino';
import { promisify } from 'util';

import { getStream, getUrls, optimizeStream } from "./utils/helpers";

const write = promisify(fs.writeFile);

const { MEDIUM_ACCOUNT, OUTPUT_DIR } = process.env;
const SCRAPE_URL = `https://medium.com/${MEDIUM_ACCOUNT}/archive`;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const scrape = async () => {
  const months = await getUrls(SCRAPE_URL);

  return Promise.all(
    months.map(async (month) => {
      logger().info(`Processing month: ${month}`);
      const stream = await getStream(month);

      return Promise.all(await optimizeStream(stream));
    })
  );
};

export const scrapeToFile = async () => {
  const entries = await scrape();

  logger().info(`Successfully scraped complete archive`);

  return write(
    `${OUTPUT_DIR}/entries.json`,
    JSON.stringify(entries.flat(), null, 2)
  );
};

(async () => {
  logger().info(`Start scraping archive URL: ${SCRAPE_URL}`);
  logger().info(`JSON output dir: ${OUTPUT_DIR}`);

  await scrapeToFile();
})();
