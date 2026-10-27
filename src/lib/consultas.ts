import type { Juego, Partida } from './types'

/** Año al que se imputa la partida: el de la fecha de fin o, en el histórico, el año guardado. */
export function anioPartida(p: Partida): number | null {
  if (p.fecha_fin) return Number(p.fecha_fin.slice(0, 4))
  if (p.anio != null) return p.anio
  if (p.fecha_inicio) return Number(p.fecha_inicio.slice(0, 4))
  return null
}

/** Clave de orden por fecha: fecha exacta si la hay, si no el año. */
export function claveFecha(p: Partida): string {
  return p.fecha_fin ?? p.fecha_inicio ?? (p.anio != null ? `${p.anio}-00-00` : '')
}

export function diasDesde(fecha: string | null): number | null {
  if (!fecha) return null
  const ms = Date.now() - new Date(fecha + 'T00:00:00').getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export interface ResumenAnio {
  anio: number
  terminados: number
  abandonados: number
  notaMedia: number | null
}

export function resumenAnio(partidas: Partida[], anio: number): ResumenAnio {
  const delAnio = partidas.filter((p) => anioPartida(p) === anio)
  const terminados = delAnio.filter((p) => p.estado === 'Terminado')
  const abandonados = delAnio.filter((p) => p.estado === 'Abandonado')
  const notas = [...terminados, ...abandonados].map((p) => p.nota).filter((n): n is number => n != null)
  return {
    anio,
    terminados: terminados.length,
    abandonados: abandonados.length,
    notaMedia: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
  }
}

export interface Revision {
  sinBuscar: Juego[]
  sinFichaClara: Juego[]
  porConfirmar: Partida[]
  sinPlataforma: Partida[]
}

export function calcularRevision(juegos: Juego[], partidas: Partida[]): Revision {
  return {
    sinBuscar: juegos.filter((j) => j.igdb_estado === 'sin_buscar'),
    sinFichaClara: juegos.filter((j) => j.igdb_estado === 'propuesto' || j.igdb_estado === 'sin_resultados'),
    porConfirmar: partidas.filter((p) => p.revisar),
    sinPlataforma: partidas.filter((p) => !p.plataforma),
  }
}

export function totalRevision(r: Revision): number {
  return r.sinFichaClara.length + r.porConfirmar.length + r.sinPlataforma.length
}
