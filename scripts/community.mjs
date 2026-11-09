// Topluluk kaynakları: Hacker News ve Reddit → "Toplulukta konuşulanlar" bölümü.
// Ayarlar (aramalar, subreddit'ler, eşikler) scripts/sources.mjs içinde.
import { hackerNews, reddit } from './sources.mjs';
import { strip, hoursSince, logSource } from './fetch.mjs';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s = '') => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);

export async function fetchHackerNews(since) {
  const after = Math.floor(since.getTime() / 1000);
  const found = new Map(); // objectID → öğe; ilk eşleşen sorgunun kategorisi kalır

  for (const q of hackerNews.queries) {
    const params = new URLSearchParams({
      query: q.query,
      tags: 'story',
      restrictSearchableAttributes: 'title',
      numericFilters: `created_at_i>${after},points>=${hackerNews.minPoints}`,
      hitsPerPage: '30',
    });
    try {
      const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, { headers: { 'User-Agent': 'frontend-gunlugu' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { hits = [] } = await res.json();
      const before = found.size;
      for (const h of hits) {
        if (found.has(h.objectID) || !h.title || (q.match && !q.match.test(h.title))) continue;
        found.set(h.objectID, {
          id: `hn:${h.objectID}`,
          title: decode(h.title),
          url: `https://news.ycombinator.com/item?id=${h.objectID}`,
          link: h.url || null,
          source: 'Hacker News',
          category: q.category,
          kind: 'community',
          date: new Date(h.created_at_i * 1000).toISOString(),
          text: decode(strip(h.story_text || '')).slice(0, 1200),
          score: h.points ?? null,
          comments: h.num_comments ?? null,
        });
      }
      // Zaman ve puan filtresini API uygular; dönen her hikâye zaten pencerede ve eşiğin üstünde.
      console.log(`[kaynak] Hacker News "${q.query}": son ${hoursSince(since)} saatte ≥${hackerNews.minPoints} puanlı ${hits.length} hikâye, ${found.size - before} tanesi yeni ve başlık filtresinden geçti`);
    } catch (e) {
      console.warn(`[uyarı] Hacker News "${q.query}" alınamadı: ${e.message}`);
    }
  }
  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, hackerNews.limit);
}

const REDDIT_UA = 'nodejs:frontend-gunlugu:1.0.0';

async function redditToken() {
  const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_UA,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Reddit token alınamadı: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

export async function fetchReddit(since) {
  let token = null;
  try {
    token = await redditToken();
  } catch (e) {
    console.warn(`[uyarı] ${e.message}; anonim erişim deneniyor.`);
  }
  const base = token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
  const headers = { 'User-Agent': REDDIT_UA };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Reddit "top" yalnızca sabit aralıklar sunar; pencereyi kapsayan en küçük aralık seçilir.
  const h = hoursSince(since);
  const t = h <= 24 ? 'day' : h <= 168 ? 'week' : h <= 720 ? 'month' : 'year';

  const results = await Promise.allSettled(
    reddit.subreddits.map(async (sub) => {
      const res = await fetch(`${base}/r/${sub.name}/top${token ? '' : '.json'}?t=${t}&limit=100&raw_json=1`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const all = (data?.data?.children || []).map((c) => c.data);
      const inWindow = all.filter((p) => new Date(p.created_utc * 1000) >= since);
      const picked = inWindow
        .filter((p) => !p.stickied && !p.over_18 && p.score >= reddit.minScore
          && !(reddit.skipFlair && p.link_flair_text && reddit.skipFlair.test(p.link_flair_text)))
        .sort((a, b) => b.score - a.score)
        .slice(0, reddit.limitPerSub)
        .map((p) => ({
          id: `reddit:${p.name}`,
          title: p.title,
          url: `https://www.reddit.com${p.permalink}`,
          link: !p.is_self && p.url && !/(^|\.)(reddit\.com|redd\.it)\//.test(p.url.replace(/^https?:\/\//, '')) ? p.url : null,
          source: `r/${sub.name}`,
          category: sub.category,
          kind: 'community',
          date: new Date(p.created_utc * 1000).toISOString(),
          text: strip(p.selftext || '').slice(0, 1200),
          score: p.score,
          comments: p.num_comments,
        }));
      return { total: all.length, inWindow: inWindow.length, picked };
    })
  );
  const items = [];
  results.forEach((r, n) => {
    const name = `r/${reddit.subreddits[n].name}`;
    if (r.status === 'rejected') return console.warn(`[uyarı] ${name} alınamadı: ${r.reason?.message}`);
    const { total, inWindow, picked } = r.value;
    logSource(name, total, inWindow, since, `, ${picked.length} tanesi eşik/filtreleri geçti`);
    items.push(...picked);
  });
  return items;
}
