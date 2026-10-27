// Intermediario de la app: guarda las claves y habla con IGDB.
// Rutas:
//   GET  /salud
//   POST /igdb/buscar     { q }            -> { resultados: Juego[] }
//   POST /igdb/emparejar  { titulos[≤10] } -> { resultados: Juego[][] }

const CAMPOS =
  'fields name,first_release_date,cover.image_id,summary,genres.name,platforms.abbreviation,platforms.name,' +
  'aggregated_rating,aggregated_rating_count,total_rating_count,url;'

let token = null // { valor, caduca }

async function obtenerToken(env) {
  if (token && token.caduca > Date.now() + 60_000) return token.valor
  const url = new URL('https://id.twitch.tv/oauth2/token')
  url.searchParams.set('client_id', env.TWITCH_CLIENT_ID)
  url.searchParams.set('client_secret', env.TWITCH_CLIENT_SECRET)
  url.searchParams.set('grant_type', 'client_credentials')
  const r = await fetch(url, { method: 'POST' })
  if (!r.ok) throw new Error(`Twitch respondió ${r.status}`)
  const d = await r.json()
  token = { valor: d.access_token, caduca: Date.now() + d.expires_in * 1000 }
  return token.valor
}

async function igdb(env, endpoint, cuerpo, reintento = true) {
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${await obtenerToken(env)}`,
      'Content-Type': 'text/plain',
    },
    body: cuerpo,
  })
  if (r.status === 401 && reintento) {
    token = null
    return igdb(env, endpoint, cuerpo, false)
  }
  if (r.status === 429 && reintento) {
    await new Promise((res) => setTimeout(res, 400))
    return igdb(env, endpoint, cuerpo, false)
  }
  if (!r.ok) throw new Error(`IGDB respondió ${r.status}: ${await r.text()}`)
  return r.json()
}

function escapar(texto) {
  return String(texto).replace(/\\/g, '\\\\').replace(/"/g, '\\"').slice(0, 200)
}

function consulta(titulo, limite) {
  return `search "${escapar(titulo)}"; ${CAMPOS} limit ${limite};`
}

function adaptar(g) {
  return {
    igdb_id: g.id,
    titulo: g.name,
    anio: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    portada_url: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
    descripcion: g.summary ?? null,
    generos: (g.genres ?? []).map((x) => x.name),
    plataformas: (g.platforms ?? []).map((x) => x.abbreviation || x.name),
    nota_critica: g.aggregated_rating != null ? Math.round(g.aggregated_rating) / 10 : null,
    num_criticas: g.aggregated_rating_count ?? null,
    popularidad: g.total_rating_count ?? 0,
    url: g.url ?? null,
  }
}

async function buscar(env, q) {
  const datos = await igdb(env, 'games', consulta(q, 10))
  return datos.map(adaptar)
}

// Hasta 10 búsquedas en una sola llamada a IGDB (multiquery).
async function emparejar(env, titulos) {
  const cuerpo = titulos.map((t, i) => `query games "${i}" { ${consulta(t, 6)} };`).join('\n')
  const datos = await igdb(env, 'multiquery', cuerpo)
  const porNombre = new Map(datos.map((d) => [d.name, d.result]))
  return titulos.map((_, i) => (porNombre.get(String(i)) ?? []).map(adaptar))
}

function cabecerasCors(origen, env) {
  const permitidos = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const ok = origen && permitidos.includes(origen)
  return {
    'Access-Control-Allow-Origin': ok ? origen : permitidos[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(datos, estado, cors) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  })
}

export default {
  async fetch(request, env) {
    const cors = cabecerasCors(request.headers.get('Origin'), env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) {
      return json({ error: 'Token no válido' }, 401, cors)
    }

    const { pathname } = new URL(request.url)
    try {
      if (pathname === '/salud') return json({ ok: true }, 200, cors)

      if (request.method === 'POST' && pathname === '/igdb/buscar') {
        const { q } = await request.json()
        if (!q || typeof q !== 'string') return json({ error: 'Falta q' }, 400, cors)
        return json({ resultados: await buscar(env, q) }, 200, cors)
      }

      if (request.method === 'POST' && pathname === '/igdb/emparejar') {
        const { titulos } = await request.json()
        if (!Array.isArray(titulos) || titulos.length === 0 || titulos.length > 10) {
          return json({ error: 'Envía entre 1 y 10 títulos' }, 400, cors)
        }
        return json({ resultados: await emparejar(env, titulos) }, 200, cors)
      }

      return json({ error: 'Ruta no encontrada' }, 404, cors)
    } catch (e) {
      return json({ error: e.message }, 502, cors)
    }
  },
}
