import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TITLE = 'Frontend Günlüğü';
const DESC = 'Next.js, Node.js, React ve React Native için günlük gelişmeler ve güvenlik bulguları.';
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const CATS = ['Next.js', 'React', 'React Native', 'Node.js', 'Diğer'];
const SEV = { critical: ['Kritik', 0], high: ['Yüksek', 1], moderate: ['Orta', 2], low: ['Düşük', 3] };
const KIND = { release: 'sürüm', blog: 'blog', security: 'güvenlik', 'security-blog': 'güvenlik yazısı', community: 'topluluk' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//.test(u) ? u : '#');
const longDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Gün özeti: "3 gelişme, 2 güvenlik, 2 topluluk". Üç sayı ayrıdır, toplamları gündeki öğe sayısıdır.
// Güvenlik = GitHub Advisory bültenleri; security-blog yazıları kategori bölümlerinde durduğu için gelişme sayılır.
// long: sayfa ve RSS başlıklarında uzun biçim ("güvenlik bulgusu", "topluluk tartışması").
function countText(d, long = false) {
  const com = d.items.filter((i) => i.kind === 'community').length;
  const sec = d.items.filter((i) => i.kind === 'security').length;
  const dev = d.items.length - com - sec;
  return [
    dev || (!com && !sec) ? `${dev} gelişme` : null,
    sec ? `${sec} güvenlik${long ? ' bulgusu' : ''}` : null,
    com ? `${com} topluluk${long ? ' tartışması' : ''}` : null,
  ].filter(Boolean).join(', ');
}

function securityItem(i) {
  const [label] = SEV[i.severity] || ['Belirsiz'];
  const meta = [i.cve, i.cvss != null ? `CVSS ${i.cvss}` : null, i.category].filter(Boolean).join(', ');
  return `<article class="item sec">
  <p class="sev">${label}</p>
  <h3><a href="${safeUrl(i.url)}">${esc(i.title)}</a></h3>
  <p class="meta">${esc(meta)}</p>
  ${i.ozet ? `<p>${esc(i.ozet)}</p>` : ''}
  ${i.affected?.length ? `<p class="detail"><b>Etkilenen:</b> ${i.affected.map(esc).join('; ')}</p>` : ''}
  ${i.patched?.length ? `<p class="detail"><b>Düzeltilen sürüm:</b> ${i.patched.map(esc).join(', ')}</p>` : ''}
</article>`;
}

function normalItem(i) {
  return `<article class="item">
  <h3><a href="${safeUrl(i.url)}">${esc(i.title)}</a></h3>
  <p class="meta">${esc(i.source)}, ${KIND[i.kind] || ''}</p>
  <p>${esc(i.ozet || (i.text || '').slice(0, 220))}</p>
</article>`;
}

function communityItem(i) {
  const meta = [i.source, i.score != null ? `${i.score} puan` : null, i.comments != null ? `${i.comments} yorum` : null, i.category].filter(Boolean).join(', ');
  const summary = i.ozet || (i.text || '').slice(0, 220);
  return `<article class="item">
  <h3><a href="${safeUrl(i.url)}">${esc(i.title)}</a></h3>
  <p class="meta">${esc(meta)}${i.link ? `, <a href="${safeUrl(i.link)}">bağlantı</a>` : ''}</p>
  ${summary ? `<p>${esc(summary)}</p>` : ''}
</article>`;
}

function renderDay(day) {
  const sec = day.items.filter((i) => i.kind === 'security').sort((a, b) => (SEV[a.severity]?.[1] ?? 9) - (SEV[b.severity]?.[1] ?? 9));
  const community = day.items.filter((i) => i.kind === 'community').sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const rest = day.items.filter((i) => i.kind !== 'security' && i.kind !== 'community');
  let html = '';
  if (sec.length) html += `<section class="security"><h2>Güvenlik bulguları</h2>${sec.map(securityItem).join('')}</section>`;
  for (const c of CATS) {
    const list = rest.filter((i) => (CATS.includes(i.category) ? i.category : 'Diğer') === c);
    if (list.length) html += `<section><h2>${c}</h2>${list.map(normalItem).join('')}</section>`;
  }
  if (community.length) html += `<section class="community"><h2>Toplulukta konuşulanlar</h2>${community.map(communityItem).join('')}</section>`;
  if (!html) html = '<p class="empty">Bu gün için yeni bir gelişme yok.</p>';
  return html;
}

const page = (title, body) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(DESC)}">
<link rel="alternate" type="application/rss+xml" title="${TITLE}" href="feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header><a class="brand" href="index.html">${TITLE}</a><a href="feed.xml">RSS</a></header>
<main>${body}</main>
<footer>${esc(DESC)} Özetler yapay zekâ ile hazırlanır; kritik kararlardan önce kaynak bağlantısını kontrol et.</footer>
</body>
</html>`;

const CSS = `:root{--bg:#f7f8fa;--ink:#16202e;--mute:#5b6676;--line:#dde2ea;--link:#1f4fd8;--sec:#b42318;--secbg:#fdeceb}
@media(prefers-color-scheme:dark){:root{--bg:#0f141b;--ink:#e6eaf0;--mute:#98a2b3;--line:#27303c;--link:#7aa2ff;--sec:#ff8a80;--secbg:#2a1717}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 'Schibsted Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif}
header,main,footer{max-width:700px;margin:0 auto;padding:0 20px}
header{display:flex;justify-content:space-between;align-items:baseline;padding-top:28px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.brand{font-weight:700;font-size:1.25rem;color:var(--ink);text-decoration:none}
a{color:var(--link)}
a:focus-visible{outline:3px solid var(--link);outline-offset:2px}
h1{font-size:2rem;line-height:1.2;margin:2rem 0 .25rem}
h2{font-size:1.3rem;margin:2.2rem 0 .5rem}
h3{font-size:1.05rem;line-height:1.35;margin:0 0 .15rem}
.date{color:var(--mute);margin:0 0 1rem}
.item{padding:.9rem 0;border-top:1px solid var(--line)}
.item p{margin:.2rem 0}
.meta{color:var(--mute);font-size:.88rem}
.detail{font-size:.92rem}
.security h2{color:var(--sec)}
.item.sec{border-left:4px solid var(--sec);padding-left:14px;margin:.7rem 0;background:var(--secbg);border-radius:0 6px 6px 0;border-top:0}
.sev{font-weight:700;color:var(--sec);font-size:.9rem}
.archive{list-style:none;padding:0}
.archive li{padding:.55rem 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px}
.empty{color:var(--mute)}
footer{color:var(--mute);font-size:.85rem;padding-top:2.5rem;padding-bottom:3rem}
`;

function rss(days) {
  const items = days.slice(0, 30).map((d) => {
    const tag = { security: '[Güvenlik] ', community: '[Topluluk] ' };
    const desc = d.items.map((i) => `${tag[i.kind] || ''}${i.title}`).join('\n');
    return `<item><title>${esc(`${longDate(d.date)}: ${countText(d, true)}`)}</title><link>${SITE_URL}/${d.date}.html</link><guid>${SITE_URL}/${d.date}.html</guid><pubDate>${new Date(d.date + 'T03:00:00Z').toUTCString()}</pubDate><description>${esc(desc)}</description></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${TITLE}</title><link>${SITE_URL}/</link><description>${esc(DESC)}</description><language>tr</language>${items.join('')}</channel></rss>`;
}

export function buildSite() {
  const contentDir = path.resolve('content');
  const out = path.resolve('dist');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const days = fs.readdirSync(contentDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')))
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const d of days) {
    fs.writeFileSync(path.join(out, `${d.date}.html`), page(`${longDate(d.date)} | ${TITLE}`, `<h1>${longDate(d.date)}</h1><p class="date">${countText(d, true)}</p>${renderDay(d)}<p><a href="index.html">Tüm günler</a></p>`));
  }

  const latest = days[0];
  const archive = `<h2>Arşiv</h2><ul class="archive">${days.map((d) => {
    return `<li><a href="${d.date}.html">${longDate(d.date)}</a><span class="meta">${countText(d)}</span></li>`;
  }).join('')}</ul>`;
  const home = latest
    ? `<h1>${longDate(latest.date)}</h1><p class="date">Son güncelleme. ${countText(latest, true)}</p>${renderDay(latest)}${archive}`
    : '<h1>Henüz içerik yok</h1><p class="empty">İlk günlük çalıştırma tamamlandığında burada görünecek.</p>';
  fs.writeFileSync(path.join(out, 'index.html'), page(TITLE, home));
  fs.writeFileSync(path.join(out, 'style.css'), CSS);
  fs.writeFileSync(path.join(out, 'feed.xml'), rss(days));
  console.log(`Site oluşturuldu: ${days.length} gün → dist/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildSite();
