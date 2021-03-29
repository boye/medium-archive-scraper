import fetch from 'node-fetch';
import logger from 'pino';
import { trim } from 'lodash';
import * as cheerio from 'cheerio';

const toCheerio = (res) => res.text().then((html) => cheerio.load(html));

export const getTimeBuckets = (url) =>
  fetch(url)
    .then(toCheerio)
    .then(($) => {
      const $links = $('.timebucket > a');

      if ($links.length === 0) {
        return url;
      }

      return $links.toArray().map((el) => el.attribs.href);
    });

export const getStream = async (url) =>
  fetch(url)
    .then(toCheerio)
    .then(($) =>
      $('.js-postStream > .streamItem')
        .toArray()
        .map((el) => ({
          title: trim($(el).find('.graf--h3').text()),
          url: $(el)
            .find('.postArticle-readMore > a')
            .attr('href')
            .split('?')[0],
          description: trim($(el).find('.graf--p').text()),
          image: $(el).find('img.progressiveMedia-image').attr('data-src'),
          datetime: $(el).find('.postMetaInline time').attr('datetime'),
          date: trim($(el).find('.postMetaInline time').text()),
          claps: Number($(el).find('[data-action="show-recommends"]').text()),
        }))
    );

export const optimizeStream = async (stream) => {
  return stream.map(async (item) => {
    const res = item;

    if (!res.image) {
      res.image = await fetch(res.url)
        .then(toCheerio)
        .then(($) => {
          const $img = cheerio.load($('.paragraph-image noscript').html());
          return $img('img').attr('src');
        })
        .catch((err) =>
          logger().warn(`Failed to get image for: ${res.url}. Error: ${err}`)
        );
    }

    if (!res.description || res.description.endsWith('…')) {
      res.description = await fetch(res.url)
        .then(toCheerio)
        .then(($) =>
          trim($('.paragraph-image').prev('p').text())
            .split('. ')
            .slice(0, 2)
            .join()
        )
        .catch((err) =>
          logger().warn(
            `Failed to get description for: ${res.url}. Error: ${err}`
          )
        );
    }

    return res;
  });
};

export const getUrls = async (url) =>
  getTimeBuckets(url).then((years) => {
    logger().info(`Archive year URLs:\n${years.join('\n')}`);
    return Promise.all(
      years.map((yearUrl) => getTimeBuckets(yearUrl))
    ).then((months) => months.flat());
  });
