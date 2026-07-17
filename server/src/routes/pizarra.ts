// @ts-nocheck
import { Router } from 'express';

const router = Router();

// Cache en memoria: { data, timestamp }
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

const GRANOS = ['Trigo', 'Maíz', 'Girasol', 'Soja', 'Sorgo'];

function parsePrecios(html: string) {
  const resultados: { grano: string; ars: string | null; usd: string | null }[] = [];

  // Extraer cada bloque board-wrapper
  const bloques = html.split('class="board-wrapper"');
  bloques.shift(); // el primero es antes del primer bloque

  for (const bloque of bloques) {
    // Nombre del grano (dentro del h3)
    const nombreMatch = bloque.match(/<h3[^>]*>[\s\S]*?<\/span>\s*([\w\sáéíóúÁÉÍÓÚü]+?)\s*<\/h3>/i);
    const nombre = nombreMatch ? nombreMatch[1].trim() : null;
    if (!nombre) continue;

    // Precio ARS (dentro de div.price)
    const arsMatch = bloque.match(/class="price"[^>]*>\s*\$?\s*([\d.,]+)/i);
    const ars = arsMatch ? arsMatch[1].trim() : null;

    // Precio USD (dentro de div.bottom, después de US$)
    const usdMatch = bloque.match(/<strong>US\$<\/strong>\s*([\d.,]+)/i);
    const usd = usdMatch ? usdMatch[1].trim() : null;

    resultados.push({ grano: nombre, ars, usd });
  }

  // Fecha del día
  const fechaMatch = html.match(/Pizarra del d[ií]a\s+([\d\/]+)/i);
  const fecha = fechaMatch ? fechaMatch[1] : new Date().toLocaleDateString('es-AR');

  return { fecha, precios: resultados };
}

router.get('/', async (req, res) => {
  try {
    // Devolver cache si es fresco
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.json(cache.data);
    }

    const response = await fetch('https://www.cac.bcr.com.ar/es/precios-de-pizarra', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgroApp/1.0)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`BCR respondió ${response.status}`);

    const html = await response.text();
    const data = parsePrecios(html);

    cache = { data, ts: Date.now() };
    res.json(data);
  } catch (error) {
    console.error('Error al obtener precios pizarra:', error);
    // Si hay cache vieja, devolverla igual
    if (cache) return res.json({ ...cache.data, stale: true });
    res.status(503).json({ error: 'No se pudo obtener los precios de pizarra' });
  }
});

export default router;
