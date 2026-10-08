import { db } from '../db/database.js';

// Website knowledge base for the AI assistant: crawls techcaddludhiana.com
// from its sitemap, keeps the page text in MongoDB and serves keyword (BM25)
// search over it from memory.

export const SITE_URL = 'https://techcaddludhiana.com';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;
const COLLECTION = 'kb_pages';
const USER_AGENT = 'TechcaddPortalAssistant/1.0';

const SKIPPED_PATHS = /^\/(privacy|terms|cookie-policy|disclaimer|sitemap-html)$/;
const COURSE_PATH = /^\/courses\/(?!category\/)[^/]+$/;

const MAX_PAGE_CHARS = 24000;
const CHUNK_CHARS = 1000;
const CRAWL_CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 20000;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const REFRESH_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// BM25 parameters
const K1 = 1.5;
const B = 0.75;
const TITLE_WEIGHT = 2;

const STOPWORDS = new Set((
  'a an and are as at be but by can do does for from has have how i if in is it its me my of on or our so ' +
  'that the their them there these they this to us was we what when where which who why will with you your ' +
  'about tell please know want give show'
).split(' '));

const pages = new Map(); // url -> page
let chunks = [];         // { url, title, text }
let postings = new Map(); // term -> [chunkIndex, weight, chunkIndex, weight, ...]
let chunkLengths = [];
let averageLength = 0;
let refreshing = false;
let lastRefreshAt = 0;

function collection() {
  return db.mongo ? db.mongo.collection(COLLECTION) : null;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

export function extractPage(html) {
  const title = decodeEntities((html.match(/<title[^>]*>([^<]*)/i) || [])[1] || '')
    .replace(/\s*\|\s*techcadd\s*$/i, '')
    .trim();
  const description = decodeEntities((html.match(/<meta\s+name="description"\s+content="([^"]*)/i) || [])[1] || '')
    .replace(/\s+/g, ' ')
    .trim();

  const stripped = html.replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const main = stripped.match(/<main\b[\s\S]*<\/main>/i);
  const text = decodeEntities(
    (main ? main[0] : stripped)
      .replace(/<\/(p|div|li|h[1-6]|section|article|tr|td|th)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    // Animated stat counters render as "0 + Trainers" in the static HTML
    .filter(line => line && !/^0\s*k?\s*\+?\s+[A-Z]/.test(line))
    .join('\n')
    .slice(0, MAX_PAGE_CHARS);

  return { title, description, text };
}

function chunkText(text) {
  const result = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (current && current.length + line.length > CHUNK_CHARS) {
      result.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
    // A single very long line still has to be cut
    while (current.length > CHUNK_CHARS * 1.5) {
      result.push(current.slice(0, CHUNK_CHARS));
      current = current.slice(CHUNK_CHARS);
    }
  }
  if (current) result.push(current);
  return result;
}

// Just enough stemming for plurals: "branches" -> "branch", "courses" -> "course"
function stem(token) {
  if (token.length <= 3 || !token.endsWith('s') || token.endsWith('ss')) return token;
  if (/(ch|sh|x|ss)es$/.test(token)) return token.slice(0, -2);
  return token.slice(0, -1);
}

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(token => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
}

function rebuildIndex() {
  const nextChunks = [];
  const nextPostings = new Map();
  const nextLengths = [];

  for (const page of pages.values()) {
    const titleTokens = tokenize(page.title);
    for (const text of chunkText(page.text)) {
      const index = nextChunks.length;
      nextChunks.push({ url: page.url, title: page.title, text });

      const tokens = tokenize(text);
      nextLengths.push(tokens.length);

      const weights = new Map();
      tokens.forEach(token => weights.set(token, (weights.get(token) || 0) + 1));
      titleTokens.forEach(token => weights.set(token, (weights.get(token) || 0) + TITLE_WEIGHT));

      for (const [token, weight] of weights) {
        let list = nextPostings.get(token);
        if (!list) nextPostings.set(token, (list = []));
        list.push(index, weight);
      }
    }
  }

  chunks = nextChunks;
  postings = nextPostings;
  chunkLengths = nextLengths;
  averageLength = nextLengths.reduce((sum, length) => sum + length, 0) / (nextLengths.length || 1);
}

// Best matching chunks for a question, at most `perPage` from the same page
export function search(query, limit = 5, perPage = 2) {
  const scores = new Map();
  for (const term of new Set(tokenize(query))) {
    const list = postings.get(term);
    if (!list) continue;
    const idf = Math.log(1 + (chunks.length - list.length / 2 + 0.5) / (list.length / 2 + 0.5));
    for (let i = 0; i < list.length; i += 2) {
      const index = list[i];
      const weight = list[i + 1];
      const norm = weight + K1 * (1 - B + B * (chunkLengths[index] / averageLength));
      scores.set(index, (scores.get(index) || 0) + idf * ((weight * (K1 + 1)) / norm));
    }
  }

  const results = [];
  const perPageCount = new Map();
  for (const [index, score] of [...scores].sort((a, b) => b[1] - a[1])) {
    const chunk = chunks[index];
    const used = perPageCount.get(chunk.url) || 0;
    if (used >= perPage) continue;
    perPageCount.set(chunk.url, used + 1);
    results.push({ ...chunk, score });
    if (results.length >= limit) break;
  }
  return results;
}

// First chunks of one specific page, e.g. '/team'
export function pageChunks(path, limit = 2) {
  const url = `${SITE_URL}${path}`;
  return chunks.filter(chunk => chunk.url === url).slice(0, limit);
}

function coursePages() {
  return [...pages.values()].filter(page => COURSE_PATH.test(page.url.slice(SITE_URL.length)));
}

// Course pages ordered by the website's own "last modified" date, newest
// first. `newlyListed` marks pages that appeared after this portal's first crawl.
export function latestCourses(limit = 10) {
  const firstSeen = [...pages.values()].map(page => page.first_seen).sort();
  const baseline = firstSeen.length ? new Date(firstSeen[0]).getTime() + REFRESH_AFTER_MS : Infinity;

  return coursePages()
    .sort((a, b) => String(b.lastmod).localeCompare(String(a.lastmod)))
    .slice(0, limit)
    .map(page => ({
      title: page.title,
      url: page.url,
      date: String(page.lastmod).slice(0, 10),
      summary: page.description.slice(0, 140),
      newlyListed: new Date(page.first_seen).getTime() > baseline
    }));
}

// Title and short description of every page under a path, e.g. '/branches/'
export function pagesUnder(prefix) {
  return [...pages.values()]
    .filter(page => page.url.startsWith(`${SITE_URL}${prefix}`))
    .map(page => ({ title: page.title, url: page.url, summary: page.description.slice(0, 140) }));
}

export function courseCatalog() {
  return coursePages().map(page => page.title).sort();
}

export function status() {
  return { pages: pages.size, chunks: chunks.length, refreshing, lastRefreshAt };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xml' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchSitemap() {
  const xml = await fetchText(SITEMAP_URL);
  return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g)]
    .map(match => ({ url: decodeEntities(match[1].trim()), lastmod: match[2] || '' }))
    .filter(entry => entry.url.startsWith(SITE_URL) && !SKIPPED_PATHS.test(entry.url.slice(SITE_URL.length)));
}

async function crawlPage(entry) {
  const existing = pages.get(entry.url);
  const now = new Date().toISOString();
  const page = {
    url: entry.url,
    ...extractPage(await fetchText(entry.url)),
    lastmod: entry.lastmod,
    first_seen: existing ? existing.first_seen : now,
    last_crawled: now
  };
  if (!page.text) return;

  pages.set(page.url, page);
  const store = collection();
  if (store) await store.replaceOne({ url: page.url }, page, { upsert: true });
}

// Re-reads the sitemap and fetches pages that are new or changed. `limit`
// caps how many pages are fetched in one run.
export async function refresh({ limit = Infinity } = {}) {
  if (refreshing) return;
  refreshing = true;
  try {
    const entries = await fetchSitemap();
    if (entries.length === 0) return;

    const listed = new Set(entries.map(entry => entry.url));
    const removed = [...pages.keys()].filter(url => !listed.has(url));
    if (removed.length > 0) {
      removed.forEach(url => pages.delete(url));
      const store = collection();
      if (store) await store.deleteMany({ url: { $in: removed } });
    }

    // Pages without a real modification date report "now", so compare by day
    const day = value => String(value).slice(0, 10);
    const queue = entries
      .filter(entry => !pages.has(entry.url) || day(pages.get(entry.url).lastmod) !== day(entry.lastmod))
      .slice(0, limit);

    let done = 0;
    let failed = 0;
    const worker = async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        try {
          await crawlPage(entry);
        } catch (err) {
          failed++;
        }
        // Make the first crawl searchable while it is still running
        if (++done % 40 === 0) rebuildIndex();
      }
    };
    await Promise.all(Array.from({ length: CRAWL_CONCURRENCY }, worker));

    rebuildIndex();
    lastRefreshAt = Date.now();
    console.log(`[Assistant] Knowledge base refreshed: ${pages.size} pages, ${chunks.length} chunks (${done - failed} fetched, ${failed} failed, ${removed.length} removed)`);
  } catch (err) {
    console.error('[Assistant] Knowledge base refresh failed:', err.message);
  } finally {
    refreshing = false;
  }
}

// Loads the stored pages, then keeps them fresh in the background
export async function init() {
  const store = collection();
  if (store) {
    await store.createIndex({ url: 1 }, { unique: true });
    const stored = await store.find({}, { projection: { _id: 0 } }).toArray();
    stored.forEach(page => pages.set(page.url, page));
    rebuildIndex();
    lastRefreshAt = stored.reduce((latest, page) => Math.max(latest, new Date(page.last_crawled).getTime() || 0), 0);
    console.log(`[Assistant] Knowledge base loaded: ${pages.size} pages, ${chunks.length} chunks`);
  }

  const refreshIfStale = () => {
    if (Date.now() - lastRefreshAt > REFRESH_AFTER_MS) refresh();
  };
  refreshIfStale();
  setInterval(refreshIfStale, REFRESH_CHECK_INTERVAL_MS).unref();
}
