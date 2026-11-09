// Kaynak listesi. Bir feed açılmazsa atlanır ve loglanır; URL'leri istediğin gibi ekle/çıkar.
// skip: başlığı bu regex'e uyan kayıtları eler (canary/nightly gürültüsünü önler).
export const feeds = [
  // Resmi sürümler
  { name: 'Next.js Releases', url: 'https://github.com/vercel/next.js/releases.atom', category: 'Next.js', type: 'release', skip: /canary|nightly/i },
  { name: 'React Releases', url: 'https://github.com/react/react/releases.atom', category: 'React', type: 'release', skip: /canary|nightly|experimental/i },
  { name: 'React Native Releases', url: 'https://github.com/react/react-native/releases.atom', category: 'React Native', type: 'release', skip: /nightly|rc\.\d+/i },
  { name: 'Node.js Releases', url: 'https://github.com/nodejs/node/releases.atom', category: 'Node.js', type: 'release' },

  // Resmi bloglar
  { name: 'React Blog', url: 'https://react.dev/rss.xml', category: 'React', type: 'blog' },
  { name: 'React Native Blog', url: 'https://reactnative.dev/blog/rss.xml', category: 'React Native', type: 'blog' },
  { name: 'Node.js Blog', url: 'https://nodejs.org/en/feed/blog.xml', category: 'Node.js', type: 'blog' },
  { name: 'Next.js Blog', url: 'https://nextjs.org/feed.xml', category: 'Next.js', type: 'blog' },

  // Şirket ve ekip blogları
  // Vercel feed'i blog + changelog'u birlikte verir (günde ~5 öğe); AI Gateway model duyuruları ve müşteri hikâyeleri elenir.
  { name: 'Vercel Blog', url: 'https://vercel.com/atom', category: 'Next.js', type: 'blog', skip: /AI Gateway|^How /i },
  { name: 'Expo Blog', url: 'https://expo.dev/blog/rss.xml', category: 'React Native', type: 'blog' },
  { name: 'Callstack Blog', url: 'https://www.callstack.com/blog/rss.xml', category: 'React Native', type: 'blog' },
  { name: 'Software Mansion Blog', url: 'https://swmansion.com/rss.xml', category: 'React Native', type: 'blog' },
  { name: 'web.dev', url: 'https://web.dev/static/blog/feed.xml', category: 'Diğer', type: 'blog' },

  // Kişisel bloglar
  { name: 'Overreacted', url: 'https://overreacted.io/rss.xml', category: 'React', type: 'blog' },
  { name: 'Josh W. Comeau', url: 'https://www.joshwcomeau.com/rss.xml', category: 'Diğer', type: 'blog' }, // ağırlıkla CSS
  { name: 'Kent C. Dodds', url: 'https://kentcdodds.com/blog/rss.xml', category: 'React', type: 'blog' },
  { name: 'TkDodo', url: 'https://tkdodo.eu/blog/rss.xml', category: 'React', type: 'blog' },

  // Güvenlik blogları (normal kategori bölümlerinde gösterilir, "Güvenlik bulguları"na girmez)
  // Socket.dev tüm ekosistemleri (npm, RubyGems, GitHub Actions, eklentiler) kapsadığı için Diğer.
  { name: 'Socket.dev Blog', url: 'https://socket.dev/api/blog/feed.atom', category: 'Diğer', type: 'security-blog' },
];

// GitHub Security Advisories'te izlenecek npm paketleri → kategori
export const advisoryPackages = {
  'next': 'Next.js',
  'react': 'React',
  'react-dom': 'React',
  'react-server-dom-webpack': 'React',
  'react-server-dom-turbopack': 'React',
  'react-server-dom-parcel': 'React', // RSC bültenleri webpack/turbopack ile birlikte parcel'i de kapsar
  'react-native': 'React Native',
};

// Topluluk kaynakları → "Toplulukta konuşulanlar" bölümü.
// Hacker News: Algolia API ile başlıkta arama. Algolia gevşek eşleştiği için `match` başlığı ayrıca doğrular.
// Sıra önemli: bir hikâye birden fazla sorguya uyarsa ilk eşleşen kategori kullanılır (React Native, React'ten önce).
export const hackerNews = {
  minPoints: 50, // bu puanın altındaki hikâyeler elenir; altı çoğunlukla resmi sürüm/bülten tekrarı
  limit: 10,     // gün başına en fazla kaç HN hikâyesi
  queries: [
    { query: 'React Native', category: 'React Native', match: /\breact[\s-]?native\b/i },
    // HN başlıkları çoğunlukla "Next.js"/"Node.js" yazar; bitişik yazım ("NextJS") ayrı kelime sayıldığı için ikisi de aranır.
    { query: 'Next.js', category: 'Next.js', match: /\bnext\.?js\b/i },
    { query: 'nextjs', category: 'Next.js', match: /\bnext\.?js\b/i },
    { query: 'Node.js', category: 'Node.js', match: /\bnode\.?js\b/i },
    { query: 'nodejs', category: 'Node.js', match: /\bnode\.?js\b/i },
    { query: 'React Server Components', category: 'React', match: /\bserver components?\b|\bRSCs?\b/i },
    { query: 'React', category: 'React', match: /\breact\b/i },
  ],
};

// Lobsters: etiket feed'leri. Başlıkta veya Lobsters etiketlerinde anahtar kelime geçen gönderiler alınır.
// Sıra önemli: ilk eşleşen anahtar kelimenin kategorisi kullanılır (React Native, React'ten önce).
export const lobsters = {
  feeds: ['https://lobste.rs/t/javascript.rss', 'https://lobste.rs/t/web.rss'],
  keywords: [
    { match: /\breact[\s-]?native\b/i, category: 'React Native' },
    { match: /\bnext\.?js\b/i, category: 'Next.js' },
    { match: /\bnode\.?js\b/i, category: 'Node.js' },
    { match: /\breact\b|\brsc\b/i, category: 'React' },
  ],
};

// DEV Community: etiket başına "top" yazılar (/api/articles?tag=...&top=N, N = gün).
// top, zaman penceresini kapsayacak şekilde büyütülür (36 saat → 2 gün, 168 saat → 7 gün).
// Bir yazı birden fazla etikette çıkarsa ilk etiketin kategorisi kullanılır.
export const devCommunity = {
  top: 1,           // en az kaç günlük "top" listesi
  minReactions: 20, // public_reactions_count eşiği
  limitPerTag: 5,   // etiket başına en fazla kaç yazı
  tags: [
    { tag: 'react', category: 'React' },
    { tag: 'nextjs', category: 'Next.js' },
    { tag: 'reactnative', category: 'React Native' },
    { tag: 'node', category: 'Node.js' },
  ],
};
