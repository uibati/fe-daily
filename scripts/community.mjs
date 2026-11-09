// Topluluk kaynakları: Hacker News, Lobsters ve DEV Community → "Toplulukta konuşulanlar" bölümü.
// Ayarlar (aramalar, anahtar kelimeler, etiketler, eşikler) scripts/sources.mjs içinde.
import { hackerNews, lobsters, devCommunity } from './sources.mjs';
import { parser, strip, hoursSince, logSource } from './fetch.mjs';

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

export async function fetchLobsters(since) {
  const found = new Map(); // guid → öğe; iki feed'de birden çıkan gönderi bir kez alınır
  for (const url of lobsters.feeds) {
    const name = `Lobsters (${url.match(/\/t\/([^.]+)\.rss/)?.[1] || url})`;
    try {
      const feed = await parser.parseURL(url);
      const inWindow = feed.items.filter((i) => new Date(i.isoDate || i.pubDate || 0) >= since);
      let matched = 0;
      for (const i of inWindow) {
        const title = strip(i.title);
        const haystack = [title, ...(i.categories || [])].join(' ');
        const kw = lobsters.keywords.find((k) => k.match.test(haystack));
        if (!kw) continue;
        matched++;
        const id = i.guid || i.comments || i.link;
        if (found.has(id)) continue;
        const discussion = i.comments || i.link;
        found.set(id, {
          id: `lobsters:${id}`,
          title,
          url: discussion,
          link: i.link && i.link !== discussion ? i.link : null,
          source: 'Lobsters',
          category: kw.category,
          kind: 'community',
          date: new Date(i.isoDate || i.pubDate).toISOString(),
          text: strip(i.contentSnippet || i.content || '').slice(0, 1200),
          score: null, // Lobsters RSS puan vermiyor
          comments: null,
        });
      }
      logSource(name, feed.items.length, inWindow.length, since, `, ${matched} tanesi anahtar kelimeyle eşleşti`);
    } catch (e) {
      console.warn(`[uyarı] ${name} alınamadı: ${e.message}`);
    }
  }
  return [...found.values()];
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchDevCommunity(since) {
  // top=N "son N gün"; pencere 24 saati aşıyorsa kapsayacak şekilde büyütülür.
  const top = Math.max(devCommunity.top, Math.ceil(hoursSince(since) / 24));
  const found = new Map(); // makale id → öğe; ilk etiketin kategorisi kalır
  for (const [n, t] of devCommunity.tags.entries()) {
    // DEV art arda gelen isteklere "Retry later" (düz metin) döner; istekler sırayla ve aralıklı atılır.
    if (n > 0) await wait(1500);
    const name = `DEV Community #${t.tag}`;
    try {
      const res = await fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(t.tag)}&top=${top}&per_page=100`, {
        headers: { 'User-Agent': 'frontend-gunlugu', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const all = await res.json();
      if (!Array.isArray(all)) throw new Error('beklenmeyen yanıt biçimi');
      const inWindow = all.filter((a) => new Date(a.published_at) >= since);
      const picked = inWindow
        .filter((a) => a.public_reactions_count >= devCommunity.minReactions)
        .sort((a, b) => b.public_reactions_count - a.public_reactions_count)
        .slice(0, devCommunity.limitPerTag);
      logSource(name, all.length, inWindow.length, since, `, ${picked.length} tanesi ≥${devCommunity.minReactions} reaksiyonlu (top=${top})`);
      for (const a of picked) {
        if (found.has(a.id)) continue;
        found.set(a.id, {
          id: `dev:${a.id}`,
          title: a.title,
          url: a.url,
          link: a.canonical_url && a.canonical_url !== a.url ? a.canonical_url : null,
          source: 'DEV Community',
          category: t.category,
          kind: 'community',
          date: new Date(a.published_at).toISOString(),
          text: strip(a.description || '').slice(0, 1200),
          score: a.public_reactions_count,
          comments: a.comments_count ?? null,
        });
      }
    } catch (e) {
      console.warn(`[uyarı] ${name} alınamadı: ${e.message}`);
    }
  }
  return [...found.values()];
}
