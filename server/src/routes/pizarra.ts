// @ts-nocheck
import { Router } from 'express';

const router = Router();

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

function parsePrecios(html: string) {
  const resultados: { grano: string; ars: string | null; usd: string | null }[] = [];

  const bloques = html.split('class="board-wrapper"');
  bloques.shift();

  for (const bloque of bloques) {
    const nombreMatch = bloque.match(/<h3[^>]*>[\s\S]*?<\/span>\s*([\w\sáéíóúÁÉÍÓÚü]+?)\s*<\/h3>/i);
    const nombre = nombreMatch ? nombreMatch[1].trim() : null;
    if (!nombre) continue;

    const arsMatch = bloque.match(/class="price"[^>]*>\s*\$?\s*([\d.,]+)/i);
    const ars = arsMatch ? arsMatch[1].trim() : null;

    const usdMatch = bloque.match(/<strong>US\$<\/strong>\s*([\d.,]+)/i);
    const usd = usdMatch ? usdMatch[1].trim() : null;

    resultados.push({ grano: nombre, ars, usd });
  }

  const fechaMatch = html.match(/Pizarra del d[ií]a\s+([\d\/]+)/i);
  const fecha = fechaMatch ? fechaMatch[1] : new Date().toLocaleDateString('es-AR');

  return { fecha, precios: resultados };
}

async function fetchDolarBNA(): Promise<number | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.venta ?? null;
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }

    // Fetch en paralelo: precios granos + dólar BNA
    const [bcrRes, dolarBNA] = await Promise.all([
      fetch('https://www.cac.bcr.com.ar/es/precios-de-pizarra', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgroApp/1.0)' },
        signal: AbortSignal.timeout(10000),
      }),
      fetchDolarBNA(),
    ]);

    if (!bcrRes.ok) throw new Error(`BCR respondió ${bcrRes.status}`);

    const html = await bcrRes.text();
    const data = { ...parsePrecios(html), dolarBNA };

    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (error) {
    console.error('Error al obtener precios pizarra:', error);
    if (cache) return res.json({ ...cache.data, stale: true });
    res.status(503).json({ error: 'No se pudo obtener los precios de pizarra' });
  }
});

export default router;
