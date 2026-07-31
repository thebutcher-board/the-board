const BASE = 'https://api.fantasypros.com/public/v2/json';

function cleanHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fp(path, apiKey) {
  const response = await fetch(`${BASE}${path}`, { headers: { 'x-api-key': apiKey } });
  if (!response.ok) throw new Error(`FantasyPros ${response.status}`);
  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.FANTASYPROS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'FantasyPros API key is not configured in Vercel.' });

  try {
    const season = process.env.FANTASY_SEASON || '2026';
    const [ecrPayload, adpPayload, newsPayload] = await Promise.all([
      fp(`/nfl/${season}/consensus-rankings?position=ALL&scoring=PPR`, apiKey),
      fp(`/nfl/${season}/consensus-rankings?position=ALL&scoring=PPR&type=ADP`, apiKey),
      fp('/nfl/news?limit=100', apiKey)
    ]);

    const map = new Map();
    const upsert = (name, values) => {
      if (!name) return;
      map.set(name.toLowerCase(), { ...(map.get(name.toLowerCase()) || { name }), ...values });
    };

    for (const p of (ecrPayload.players || ecrPayload.rankings || [])) {
      upsert(p.player_name || p.name, { ecr: Number(p.rank_ecr || p.rank || 0) || null, tier: Number(p.tier || 0) || null, fpid: p.player_id || p.fpid || null });
    }
    for (const p of (adpPayload.players || adpPayload.rankings || [])) {
      upsert(p.player_name || p.name, { adp: Number(p.rank_ave || p.rank_adp || p.adp || p.rank_ecr || p.rank || 0) || null });
    }
    for (const n of (newsPayload.items || [])) {
      const name = n.player_name || n.name;
      const fpid = n.player_id || n.fpid;
      let record = name ? map.get(String(name).toLowerCase()) : null;
      if (!record && fpid) record = [...map.values()].find(p => String(p.fpid) === String(fpid));
      if (!record) continue;
      record.news = record.news || [];
      record.news.push({ title: cleanHtml(n.title || n.desc), summary: cleanHtml(n.desc), category: n.category || 'news', created: n.created_formated || n.created || null, link: n.link || null });
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ source: 'FantasyPros', season, updatedAt: new Date().toISOString(), players: [...map.values()] });
  } catch (error) {
    return res.status(502).json({ error: 'FantasyPros data could not be refreshed.', detail: error.message });
  }
};
