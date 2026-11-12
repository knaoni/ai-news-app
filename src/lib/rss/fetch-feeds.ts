import Parser from "rss-parser";
import { RSS_FEEDS, type RssFeedConfig } from "./feeds";

export type FetchedArticle = {
  url: string;
  titleOriginal: string;
  contentOriginal: string;
  source: string;
  publishedAt: Date | null;
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const parser = new Parser();

async function fetchFeed(feed: RssFeedConfig): Promise<FetchedArticle[]> {
  const { items } = await parser.parseURL(feed.url);
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;

  return items
    .filter((item) => Boolean(item.link && item.title))
    .filter((item) => !item.isoDate || new Date(item.isoDate).getTime() >= cutoff)
    .map((item) => {
      const contentOriginal =
        (item.contentSnippet ?? item.content ?? item.summary ?? "").trim() ||
        item.title!;

      return {
        url: item.link!,
        titleOriginal: item.title!,
        contentOriginal,
        source: feed.source,
        publishedAt: item.isoDate ? new Date(item.isoDate) : null,
      };
    });
}

export async function fetchAllFeeds() {
  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));

  const articles: FetchedArticle[] = [];
  const failedSources: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      failedSources.push(RSS_FEEDS[index].source);
    }
  });

  return { articles, failedSources };
}
