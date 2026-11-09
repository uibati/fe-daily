# Frontend Günlüğü

Her sabah 06:00'da (TR) Next.js, Node.js, React ve React Native için yeni sürümleri, blog yazılarını ve güvenlik bültenlerini toplar, Claude ile Türkçe özetler ve GitHub Pages'te yayınlar.

## Kurulum
1. Bu klasörü yeni bir GitHub reposuna push et.
2. **Settings → Pages → Source: GitHub Actions** seç.
3. **Settings → Secrets and variables → Actions** altında `ANTHROPIC_API_KEY` secret'ı ekle (yoksa özetsiz, orijinal başlık/metinle yayınlanır).
4. **Actions → daily → Run workflow** ile ilk çalıştırmayı elle başlat.

## Yerelde deneme
```bash
npm install
ANTHROPIC_API_KEY=... npm run daily
npx serve dist
```

## Özelleştirme
- Kaynaklar ve izlenen paketler: `scripts/sources.mjs`
- Görünüm: `scripts/build.mjs` içindeki `CSS`
- Model: `CLAUDE_MODEL` ortam değişkeni (varsayılan `claude-sonnet-5-5`)

Not: Güvenlik bülteni alanları (CVE, CVSS, etkilenen/düzeltilen sürüm) doğrudan GitHub Advisory verisinden gelir, yapay zekâ yalnızca kısa özet yazar.
