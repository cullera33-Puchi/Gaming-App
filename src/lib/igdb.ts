import { leerAjustes } from './ajustes'
import { traducirGenero } from './generos'
import { anioEnTitulo, normalizarTitulo, similitud, tituloSinAnio } from './texto'
import type { IgdbJuego, Juego } from './types'

export class IntermediarioNoConfigurado extends Error {
  constructor() {
    super('Falta la dirección del intermediario en Ajustes')
  }
}

async function llamar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const { intermediario_url, intermediario_token } = await leerAjustes()
  if (!intermediario_url) throw new IntermediarioNoConfigurado()
  const url = intermediario_url.replace(/\/+$/, '') + ruta
  const resp = await fetch(url, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(intermediario_token ? { 'X-App-Token': intermediario_token } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  if (!resp.ok) {
    const texto = await resp.text().catch(() => '')
    throw new Error(`El intermediario respondió ${resp.status}${texto ? `: ${texto}` : ''}`)
  }
  return (await resp.json()) as T
}

function adaptar(r: IgdbJuego): IgdbJuego {
  return { ...r, generos: r.generos.map(traducirGenero) }
}

export async function probarIntermediario(): Promise<boolean> {
  const r = await llamar<{ ok: boolean }>('/salud')
  return r.ok
}

export async function buscarEnIgdb(titulo: string): Promise<IgdbJuego[]> {
  const r = await llamar<{ resultados: IgdbJuego[] }>('/igdb/buscar', { q: titulo })
  return r.resultados.map(adaptar)
}

/** Busca hasta 10 títulos en una sola llamada. */
export async function buscarVariosEnIgdb(titulos: string[]): Promise<IgdbJuego[][]> {
  const r = await llamar<{ resultados: IgdbJuego[][] }>('/igdb/emparejar', { titulos })
  return r.resultados.map((lista) => lista.map(adaptar))
}

export interface Decision {
  elegido: IgdbJuego | null
  candidatos: IgdbJuego[]
}

/**
 * Elige la ficha de IGDB solo si la coincidencia es clara:
 * título idéntico (tras normalizar) y sin otro igual con popularidad parecida.
 * Si el título lleva año entre paréntesis, se usa para desempatar.
 */
export function decidirCoincidencia(titulo: string, candidatos: IgdbJuego[]): Decision {
  const anio = anioEnTitulo(titulo)
  const base = normalizarTitulo(tituloSinAnio(titulo))
  const completo = normalizarTitulo(titulo)
  const ordenados = [...candidatos].sort((a, b) => similitud(titulo, b.titulo) - similitud(titulo, a.titulo))

  let exactos = candidatos.filter((c) => {
    const n = normalizarTitulo(c.titulo)
    return n === completo || n === base
  })
  if (anio != null && exactos.length > 0) {
    const delAnio = exactos.filter((c) => c.anio === anio)
    if (delAnio.length === 0) return { elegido: null, candidatos: ordenados }
    exactos = delAnio
  }
  if (exactos.length === 1) return { elegido: exactos[0], candidatos: ordenados }
  if (exactos.length > 1) {
    const porPopularidad = [...exactos].sort((a, b) => b.popularidad - a.popularidad)
    const [primero, segundo] = porPopularidad
    if (primero.popularidad >= 10 && primero.popularidad >= 3 * segundo.popularidad) {
      return { elegido: primero, candidatos: ordenados }
    }
  }
  return { elegido: null, candidatos: ordenados }
}

/** Campos del juego que se rellenan al vincularlo con una ficha de IGDB. */
export function camposDesdeIgdb(r: IgdbJuego): Partial<Juego> {
  return {
    igdb_id: r.igdb_id,
    igdb_estado: 'confirmado',
    igdb_propuestas: [],
    igdb_url: r.url,
    anio_lanzamiento: r.anio,
    portada_url: r.portada_url,
    descripcion: r.descripcion,
    generos: r.generos,
    nota_critica: r.nota_critica,
    fuente_critica: r.nota_critica != null ? `IGDB${r.num_criticas ? `, ${r.num_criticas} críticas` : ''}` : null,
  }
}
