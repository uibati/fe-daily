import Parser from 'rss-parser';
import { advisoryPackages } from './sources.mjs';

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'frontend-gunlugu' } });
const strip = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export async function fetchFeeds(feeds, since) {
  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      const feed = await parser.parseURL(f.url);
      return feed.items
        .map((i) => ({
          id: i.guid || i.link,
          title: strip(i.title),
          url: i.link,
          source: f.name,
          category: f.category,
          kind: f.type,
          date: new Date(i.isoDate || i.pubDate || 0).toISOString(),
          text: strip(i.contentSnippet || i.content || '').slice(0, 1200),
        }))
        .filter((i) => new Date(i.date) >= since && !(f.skip && f.skip.test(i.title)));
    })
  );
  const items = [];
  results.forEach((r, n) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else console.warn(`[uyarı] ${feeds[n].name} alınamadı: ${r.reason?.message}`);
  });
  return items;
}

export async function fetchAdvisories(since) {
  const pkgs = Object.keys(advisoryPackages);
  const params = new URLSearchParams({
    type: 'reviewed',
    ecosystem: 'npm',
    affects: pkgs.join(','),
    published: `>=${since.toISOString().slice(0, 10)}`,
    per_page: '50',
  });
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'frontend-gunlugu',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/advisories?${params}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data
      .filter((a) => new Date(a.published_at) >= since)
      .map((a) => {
        const vulns = (a.vulnerabilities || []).filter((v) => advisoryPackages[v.package?.name]);
        const first = vulns[0]?.package?.name;
        return {
          id: a.ghsa_id,
          title: a.summary,
          url: a.html_url,
          source: 'GitHub Advisory',
          category: advisoryPackages[first] || 'Diğer',
          kind: 'security',
          date: new Date(a.published_at).toISOString(),
          text: strip(a.description || '').slice(0, 1200),
          severity: a.severity,
          cvss: a.cvss?.score ?? null,
          cve: a.cve_id,
          affected: vulns.map((v) => `${v.package.name} ${v.vulnerable_version_range}`),
          patched: vulns.map((v) => v.first_patched_version).filter(Boolean),
        };
      });
  } catch (e) {
    console.warn(`[uyarı] Güvenlik bültenleri alınamadı: ${e.message}`);
    return [];
  }
}
