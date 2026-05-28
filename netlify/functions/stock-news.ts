import type { Config, Context } from "@netlify/functions";
import { json } from "./_admin-auth";

function textBetween(value: string, start: string, end: string) {
  const from = value.indexOf(start);
  if (from === -1) return "";
  const to = value.indexOf(end, from + start.length);
  if (to === -1) return "";
  return value.slice(from + start.length, to);
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol") || "";
  const name = url.searchParams.get("name") || "";
  const query = encodeURIComponent(`${symbol} ${name} 台股 股票 最新消息`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 stock-watch-app",
    },
  });

  if (!response.ok) {
    return json({ items: [] }, { status: 502 });
  }

  const xml = await response.text();
  const items = xml
    .split("<item>")
    .slice(1, 7)
    .map((item) => ({
      title: decodeHtml(textBetween(item, "<title>", "</title>")),
      link: decodeHtml(textBetween(item, "<link>", "</link>")),
      source: decodeHtml(textBetween(item, "<source", "</source>").replace(/^.*?>/, "")),
      publishedAt: decodeHtml(textBetween(item, "<pubDate>", "</pubDate>")),
    }))
    .filter((item) => item.title && item.link);

  return json({ items });
};

export const config: Config = {
  path: "/api/stock-news",
};
