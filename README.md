# Frontend Günlüğü

Her sabah 06:00'da (TR) Next.js, Node.js, React ve React Native için yeni sürümleri, blog yazılarını ve güvenlik bültenlerini toplar, Claude ile Türkçe özetler ve GitHub Pages'te yayınlar.

## Kurulum
1. Bu klasörü yeni bir GitHub reposuna push et.
2. **Settings → Pages → Source: GitHub Actions** seç.
3. **Settings → Secrets and variables → Actions** altında `ANTHROPIC_API_KEY` secret'ı ekle (yoksa özetsiz, orijinal başlık/metinle yayınlanır).
4. (Önerilir) Reddit için https://www.reddit.com/prefs/apps adresinden **script** türünde bir uygulama oluşturup `REDDIT_CLIENT_ID` ve `REDDIT_CLIENT_SECRET` secret'larını ekle. Reddit, GitHub Actions'tan gelen anonim istekleri sıkça engeller; bunlar yoksa anonim erişim denenir, başarısız olursa Reddit atlanır.
5. **Actions → daily → Run workflow** ile ilk çalıştırmayı elle başlat.

## Yerelde deneme
```bash
npm install
ANTHROPIC_API_KEY=... npm run daily
npx serve dist
```

## Özelleştirme
- Kaynaklar ve izlenen paketler: `scripts/sources.mjs` (Hacker News sorguları, subreddit'ler ve puan eşikleri dahil)
- Görünüm: `scripts/build.mjs` içindeki `CSS`
- Model: `CLAUDE_MODEL` ortam değişkeni (varsayılan `claude-sonnet-5-5`)

Not: Güvenlik bülteni alanları (CVE, CVSS, etkilenen/düzeltilen sürüm) doğrudan GitHub Advisory verisinden gelir, yapay zekâ yalnızca kısa özet yazar.

## Yapılacaklar
- [ ] `ANTHROPIC_API_KEY` secret'ı eklenecek, böylece Türkçe özetleme (`scripts/summarize.mjs`) devreye girecek. Şu an anahtar yok; özetleme atlanıyor, kartlarda orijinal başlık ve metin kısaltması görünüyor.
