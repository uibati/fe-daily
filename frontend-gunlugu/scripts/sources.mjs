// Kaynak listesi. Bir feed açılmazsa atlanır ve loglanır; URL'leri istediğin gibi ekle/çıkar.
// skip: başlığı bu regex'e uyan kayıtları eler (canary/nightly gürültüsünü önler).
export const feeds = [
  // Resmi sürümler
  { name: 'Next.js Releases', url: 'https://github.com/vercel/next.js/releases.atom', category: 'Next.js', type: 'release', skip: /canary|nightly/i },
  { name: 'React Releases', url: 'https://github.com/facebook/react/releases.atom', category: 'React', type: 'release', skip: /canary|nightly|experimental/i },
  { name: 'React Native Releases', url: 'https://github.com/facebook/react-native/releases.atom', category: 'React Native', type: 'release', skip: /nightly|rc\.\d+/i },
  { name: 'Node.js Releases', url: 'https://github.com/nodejs/node/releases.atom', category: 'Node.js', type: 'release' },

  // Resmi bloglar
  { name: 'React Blog', url: 'https://react.dev/rss.xml', category: 'React', type: 'blog' },
  { name: 'React Native Blog', url: 'https://reactnative.dev/blog/rss.xml', category: 'React Native', type: 'blog' },
  { name: 'Node.js Blog', url: 'https://nodejs.org/en/feed/blog.xml', category: 'Node.js', type: 'blog' },
  { name: 'Next.js Blog', url: 'https://nextjs.org/feed.xml', category: 'Next.js', type: 'blog' },
];

// GitHub Security Advisories'te izlenecek npm paketleri → kategori
export const advisoryPackages = {
  'next': 'Next.js',
  'react': 'React',
  'react-dom': 'React',
  'react-server-dom-webpack': 'React',
  'react-server-dom-turbopack': 'React',
  'react-native': 'React Native',
};
