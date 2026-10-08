// Tech headlines for the AI assistant, read from public RSS/Atom feeds so
// "what's new in tech" answers are current instead of coming from model memory.

const FEEDS = [
  { source: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { source: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { source: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { source: 'Hacker News', url: 'https://hnrss.org/frontpage', titleOnly: true }
];

const CACHE_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const ITEMS_PER_FEED = 5;
const SUMMARY_CHARS = 160;

let cache = { items: [], fetchedAt: 0 };
let pending = null;

function clean(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;|&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&#\d+;|&#x[0-9a-f]+;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? match[1] : '';
}

export function parseFeed(xml, feed) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  return blocks.slice(0, ITEMS_PER_FEED).map((block) => {
    const link = clean(tag(block, 'link')) || (block.match(/<link\b[^>]*href="([^"]+)"/i) || [])[1] || '';
    const date = new Date(clean(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated')));
    const summary = feed.titleOnly ? '' : clean(tag(block, 'description') || tag(block, 'summary') || tag(block, 'content'));
    return {
      source: feed.source,
      title: clean(tag(block, 'title')),
      url: link,
      date: isNaN(date) ? null : date.toISOString(),
      summary: summary.length > SUMMARY_CHARS ? `${summary.slice(0, SUMMARY_CHARS).trim()}...` : summary
    };
  }).filter(item => item.title && item.url);
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'TechcaddPortalAssistant/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text(), feed);
}

async function load() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = results
    .flatMap(result => (result.status === 'fulfilled' ? result.value : []))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // Keep the previous headlines if every feed failed
  if (items.length > 0) cache = { items, fetchedAt: Date.now() };
  return cache.items;
}

// Newest headlines across all feeds
export async function getTechNews(limit = 10) {
  if (Date.now() - cache.fetchedAt > CACHE_MS) {
    pending = pending || load().finally(() => { pending = null; });
    await pending;
  }
  return cache.items.slice(0, limit);
}
