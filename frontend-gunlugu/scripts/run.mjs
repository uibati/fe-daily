import fs from 'node:fs';
import path from 'node:path';
import { feeds } from './sources.mjs';
import { fetchFeeds, fetchAdvisories } from './fetch.mjs';
import { fetchHackerNews, fetchReddit } from './community.mjs';
import { summarize } from './summarize.mjs';
import { buildSite } from './build.mjs';

const CONTENT = path.resolve('content');
const SEEN_FILE = path.join(CONTENT, 'seen.json');
fs.mkdirSync(CONTENT, { recursive: true });

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD
const since = new Date(Date.now() - 36 * 60 * 60 * 1000); // 36 saat: cron gecikmelerine tolerans

const seen = new Set(fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : []);

const [feedItems, advisories, hnItems, redditItems] = await Promise.all([
  fetchFeeds(feeds, since),
  fetchAdvisories(since),
  fetchHackerNews(since),
  fetchReddit(since),
]);
const fresh = [...advisories, ...feedItems, ...hnItems, ...redditItems].filter((i) => i.id && !seen.has(i.id));
const count = (k) => fresh.filter((i) => i.kind === k).length;
console.log(`${fresh.length} yeni öğe bulundu: ${count('security')} güvenlik bülteni, ${count('community')} topluluk tartışması.`);

await summarize(fresh);

const dayFile = path.join(CONTENT, `${today}.json`);
const existing = fs.existsSync(dayFile) ? JSON.parse(fs.readFileSync(dayFile, 'utf8')) : { date: today, items: [] };
existing.items.push(...fresh);
fs.writeFileSync(dayFile, JSON.stringify(existing, null, 2));

fresh.forEach((i) => seen.add(i.id));
fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen].slice(-3000)));

buildSite();
