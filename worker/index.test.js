import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './src/index.js'

const env = {
  TWITCH_CLIENT_ID: 'id',
  TWITCH_CLIENT_SECRET: 'secreto',
  APP_TOKEN: 'clave',
  ALLOWED_ORIGINS: 'https://cullera33-puchi.github.io,http://localhost:5173',
}

const juegoIgdb = {
  id: 7346,
  name: 'The Legend of Zelda: Breath of the Wild',
  first_release_date: 1488499200,
  cover: { image_id: 'co3p2d' },
  summary: 'Resumen',
  genres: [{ name: 'Adventure' }],
  platforms: [{ abbreviation: 'Switch' }],
  aggregated_rating: 97.4,
  aggregated_rating_count: 30,
  total_rating_count: 4000,
  url: 'https://www.igdb.com/games/the-legend-of-zelda-breath-of-the-wild',
}

function peticion(ruta, cuerpo, token = 'clave') {
  return new Request(`https://w.dev${ruta}`, {
    method: cuerpo ? 'POST' : 'GET',
    headers: { Origin: 'https://cullera33-puchi.github.io', 'X-App-Token': token, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
}

function simularFetch() {
  const llamadas = []
  vi.stubGlobal('fetch', async (url, init) => {
    llamadas.push({ url: String(url), body: init?.body })
    if (String(url).startsWith('https://id.twitch.tv')) {
      return Response.json({ access_token: 'tok', expires_in: 3600 })
    }
    if (String(url).endsWith('/multiquery')) {
      return Response.json([
        { name: '0', result: [juegoIgdb] },
        { name: '1', result: [] },
      ])
    }
    return Response.json([juegoIgdb])
  })
  return llamadas
}

afterEach(() => vi.unstubAllGlobals())

describe('intermediario', () => {
  it('rechaza peticiones sin token', async () => {
    const r = await worker.fetch(peticion('/salud', null, 'otro'), env)
    expect(r.status).toBe(401)
  })

  it('responde a la comprobación con CORS del origen permitido', async () => {
    const r = await worker.fetch(peticion('/salud'), env)
    expect(await r.json()).toEqual({ ok: true })
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://cullera33-puchi.github.io')
  })

  it('busca y adapta el resultado de IGDB', async () => {
    const llamadas = simularFetch()
    const r = await worker.fetch(peticion('/igdb/buscar', { q: 'Zelda "BotW"' }), env)
    const { resultados } = await r.json()
    expect(resultados[0]).toEqual({
      igdb_id: 7346,
      titulo: 'The Legend of Zelda: Breath of the Wild',
      anio: 2017,
      portada_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg',
      descripcion: 'Resumen',
      generos: ['Adventure'],
      plataformas: ['Switch'],
      nota_critica: 9.7,
      num_criticas: 30,
      popularidad: 4000,
      url: 'https://www.igdb.com/games/the-legend-of-zelda-breath-of-the-wild',
    })
    expect(llamadas.at(-1).body).toContain('search "Zelda \\"BotW\\"";')
  })

  it('empareja varios títulos en una sola llamada', async () => {
    const llamadas = simularFetch()
    const r = await worker.fetch(peticion('/igdb/emparejar', { titulos: ['Zelda', 'Nada'] }), env)
    const { resultados } = await r.json()
    expect(resultados.map((l) => l.length)).toEqual([1, 0])
    expect(llamadas.filter((l) => l.url.includes('igdb.com'))).toHaveLength(1)
  })

  it('limita los lotes a 10 títulos', async () => {
    const r = await worker.fetch(peticion('/igdb/emparejar', { titulos: Array(11).fill('x') }), env)
    expect(r.status).toBe(400)
  })
})
