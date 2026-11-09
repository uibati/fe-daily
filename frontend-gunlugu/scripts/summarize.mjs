import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const SYSTEM = `Sen bir frontend haber editörüsün. Sana JSON dizisi olarak gelişmeler verilecek.
Her biri için Türkçe, 1-2 cümlelik, sade bir özet yaz.
Kurallar: Yalnızca verilen metne dayan, bilgi uydurma. Sürüm numaralarını, paket adlarını ve teknik terimleri olduğu gibi koru.
Metin yetersizse başlığa dayanarak kısa bir özet yaz.
tur "community" olanlar Hacker News veya Reddit tartışmalarıdır: neyin konuşulduğunu anlat, gönderideki iddiaları kesin bilgi gibi sunma.
Çıktı yalnızca şu biçimde bir JSON dizisi olsun: [{"n": 0, "ozet": "..."}]. Başka metin, açıklama veya kod bloğu ekleme.`;

export async function summarize(items) {
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return items;
  const client = new Anthropic();

  for (let start = 0; start < items.length; start += 15) {
    const chunk = items.slice(start, start + 15);
    const payload = chunk.map((i, n) => ({ n, baslik: i.title, kaynak: i.source, tur: i.kind, metin: i.text }));
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      });
      const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const arr = JSON.parse(text.replace(/```json|```/g, '').trim());
      for (const a of arr) if (chunk[a.n] && typeof a.ozet === 'string') chunk[a.n].ozet = a.ozet;
    } catch (e) {
      console.warn(`[uyarı] Özetleme başarısız (${start}-${start + chunk.length}): ${e.message}`);
    }
  }
  return items;
}
