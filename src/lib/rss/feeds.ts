export type RssFeedConfig = {
  source: string;
  url: string;
};

export const RSS_FEEDS: RssFeedConfig[] = [
  {
    source: "TechCrunch",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
  },
  {
    source: "The Verge",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  },
];
