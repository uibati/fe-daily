import Parser from 'rss-parser';
import { advisoryPackages } from './sources.mjs';

// Connection: close → Node 22 bağlantıları açık tutar (keep-alive); kapatılmazsa süreç, sunucu bağlantıyı
// bırakana kadar bitmez (Medium/web.dev'de dakikalarca, GitHub'da ~30 sn).
export const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'frontend-gunlugu', Connection: 'close' } });
export const strip = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Kaynak logu: "açıldı ama pencerede içerik yok" ile "açılmadı" ([uyarı] satırı) ayrımı için.
export const hoursSince = (since) => Math.round((Date.now() - since.getTime()) / 3600e3);
export const logSource = (name, total, inWindow, since, note = '') =>
  console.log(`[kaynak] ${name}: ${total} öğe çekildi, ${inWindow} tanesi son ${hoursSince(since)} saatte${note}`);

export async function fetchFeeds(feeds, since) {
  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      const feed = await parser.parseURL(f.url);
      const all = feed.items.map((i) => ({
          id: i.guid || i.link,
          title: strip(i.title),
          url: i.link,
          source: f.name,
          category: f.category,
          kind: f.type,
          date: new Date(i.isoDate || i.pubDate || 0).toISOString(),
          text: strip(i.contentSnippet || i.content || '').slice(0, 1200),
        }));
      const inWindow = all.filter((i) => new Date(i.date) >= since);
      const kept = inWindow.filter((i) => !(f.skip && f.skip.test(i.title)));
      return { total: all.length, inWindow: inWindow.length, kept };
    })
  );
  const items = [];
  results.forEach((r, n) => {
    const f = feeds[n];
    if (r.status === 'rejected') return console.warn(`[uyarı] ${f.name} alınamadı: ${r.reason?.message}`);
    const { total, inWindow, kept } = r.value;
    const skipped = inWindow - kept.length;
    logSource(f.name, total, inWindow, since, skipped ? ` (${skipped} tanesi skip filtresiyle elendi)` : '');
    items.push(...kept);
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
    const inWindow = data.filter((a) => new Date(a.published_at) >= since);
    logSource('GitHub Advisory', data.length, inWindow.length, since);
    return inWindow
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
          // Eski `cvss` alanı kullanımdan kalkıyor ve çoğu bültende boş; önce cvss_severities (v4, sonra v3). 0 = puan yok.
          cvss: a.cvss_severities?.cvss_v4?.score || a.cvss_severities?.cvss_v3?.score || a.cvss?.score || null,
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
