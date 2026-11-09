import fs from 'node:fs';
import path from 'node:path';
import { feeds } from './sources.mjs';
import { fetchFeeds, fetchAdvisories } from './fetch.mjs';
import { fetchHackerNews, fetchLobsters, fetchDevCommunity } from './community.mjs';
import { summarize } from './summarize.mjs';
import { buildSite } from './build.mjs';

const CONTENT = path.resolve('content');
const SEEN_FILE = path.join(CONTENT, 'seen.json');
fs.mkdirSync(CONTENT, { recursive: true });

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD
// SINCE_HOURS: kaç saat geriye bakılacağı. Varsayılan 36 (cron gecikmelerine tolerans);
// elle çalıştırırken ör. 168 (1 hafta) verilebilir. Bulunan her şey bugünün dosyasına yazılır.
const SINCE_HOURS = Number(process.env.SINCE_HOURS || 36);
if (!Number.isFinite(SINCE_HOURS) || SINCE_HOURS <= 0) throw new Error(`Geçersiz SINCE_HOURS: "${process.env.SINCE_HOURS}"`);
const since = new Date(Date.now() - SINCE_HOURS * 60 * 60 * 1000);
console.log(`Zaman penceresi: son ${SINCE_HOURS} saat (${since.toISOString()} sonrası)`);

const seen = new Set(fs.existsSync(SEEN_FILE) ? JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')) : []);

const [feedItems, advisories, hnItems, lobstersItems, devItems] = await Promise.all([
  fetchFeeds(feeds, since),
  fetchAdvisories(since),
  fetchHackerNews(since),
  fetchLobsters(since),
  fetchDevCommunity(since),
]);
const fresh = [...advisories, ...feedItems, ...hnItems, ...lobstersItems, ...devItems].filter((i) => i.id && !seen.has(i.id));
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
