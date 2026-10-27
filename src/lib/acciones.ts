import { guardarAjuste, leerAjustes } from './ajustes'
import { db } from './db'
import { precargarPortada } from './emparejar'
import { camposDesdeIgdb } from './igdb'
import {
  importarDatosIniciales,
  juegoVacio,
  partidaVacia,
  type FicheroBacklog,
  type FicheroHistorico,
} from './importar'
import { ahoraIso, hoy, normalizarTitulo } from './texto'
import type { Estado, IgdbJuego, Juego, Partida } from './types'

export async function cargarDatosIniciales(): Promise<{ juegos: number; partidas: number }> {
  const ajustes = await leerAjustes()
  if (ajustes.carga_inicial) throw new Error('La carga inicial ya se hizo')
  const [historico, backlog] = await Promise.all([
    import('../../data/historico_juegos_2021_2026.json'),
    import('../../data/backlog_juegos.json'),
  ])
  const r = importarDatosIniciales(
    historico.default as unknown as FicheroHistorico,
    backlog.default as unknown as FicheroBacklog,
  )
  await db.transaction('rw', db.juegos, db.partidas, db.ajustes, async () => {
    await db.juegos.bulkAdd(r.juegos)
    await db.partidas.bulkAdd(r.partidas)
    const nuevas = r.plataformas.filter((p) => !ajustes.plataformas.includes(p))
    if (nuevas.length) await guardarAjuste('plataformas', [...ajustes.plataformas, ...nuevas])
    await guardarAjuste('carga_inicial', ahoraIso())
  })
  return { juegos: r.juegos.length, partidas: r.partidas.length }
}

/** Abandonar en un toque: guarda fecha y horas al momento, sin pedir nada más. */
export async function abandonar(partida: Partida): Promise<Partida> {
  const antes = { ...partida }
  await db.partidas.update(partida.id, {
    estado: 'Abandonado',
    fecha_fin: hoy(),
    completado_100: null,
    actualizado: ahoraIso(),
  })
  return antes
}

export async function deshacer(antes: Partida): Promise<void> {
  await db.partidas.put(antes)
}

export async function actualizarPartida(id: string, cambios: Partial<Partida>): Promise<void> {
  await db.partidas.update(id, { ...cambios, actualizado: ahoraIso() })
}

export async function actualizarHoras(partida: Partida, horas: number | null): Promise<void> {
  await actualizarPartida(partida.id, { horas, ultima_sesion: hoy() })
}

/** Cambia el estado aplicando las reglas: fechas al empezar y al cerrar, campos que solo valen en ciertos estados. */
export function aplicarCambioEstado(p: Partida, estado: Estado): Partida {
  const n: Partida = { ...p, estado }
  if (estado === 'Jugando' && !n.fecha_inicio) n.fecha_inicio = hoy()
  if ((estado === 'Terminado' || estado === 'Abandonado') && !n.fecha_fin && n.anio == null) n.fecha_fin = hoy()
  if (estado !== 'Terminado') n.completado_100 = null
  if (estado !== 'Abandonado') {
    n.motivo_abandono = []
    n.retomar = null
  }
  if (estado !== 'Terminado' && estado !== 'Abandonado') n.fecha_fin = null
  return n
}

export async function cambiarEstado(p: Partida, estado: Estado): Promise<void> {
  await db.partidas.put({ ...aplicarCambioEstado(p, estado), actualizado: ahoraIso() })
}

export async function borrarPartida(p: Partida): Promise<void> {
  await db.transaction('rw', db.juegos, db.partidas, async () => {
    await db.partidas.delete(p.id)
    const quedan = await db.partidas.where('juego_id').equals(p.juego_id).count()
    if (quedan === 0) await db.juegos.delete(p.juego_id)
  })
}

export async function asignarPlataforma(ids: string[], plataforma: string): Promise<void> {
  const ahora = ahoraIso()
  await db.partidas.bulkUpdate(ids.map((key) => ({ key, changes: { plataforma, actualizado: ahora } })))
}

export async function vincularIgdb(juegoId: string, r: IgdbJuego): Promise<void> {
  await db.juegos.update(juegoId, { ...camposDesdeIgdb(r), actualizado: ahoraIso() })
  precargarPortada(r.portada_url)
}

export async function dejarSinIgdb(juegoId: string): Promise<void> {
  await db.juegos.update(juegoId, { igdb_estado: 'manual', igdb_propuestas: [], actualizado: ahoraIso() })
}

export async function actualizarJuego(id: string, cambios: Partial<Juego>): Promise<void> {
  const extra = cambios.titulo ? { titulo_norm: normalizarTitulo(cambios.titulo) } : {}
  await db.juegos.update(id, { ...cambios, ...extra, actualizado: ahoraIso() })
}

export interface DatosAlta {
  igdb: IgdbJuego | null
  titulo: string
  portada_url: string | null
  plataforma: string
  estado: Estado
}

/** Alta de juego: si ya existe (mismo IGDB o mismo título) se le añade una partida. */
export async function darDeAlta(d: DatosAlta): Promise<string> {
  const ahora = ahoraIso()
  return db.transaction('rw', db.juegos, db.partidas, async () => {
    let juego: Juego | undefined
    if (d.igdb) juego = await db.juegos.where('igdb_id').equals(d.igdb.igdb_id).first()
    if (!juego) juego = await db.juegos.where('titulo_norm').equals(normalizarTitulo(d.titulo)).first()
    if (!juego) {
      juego = juegoVacio(d.titulo.trim(), ahora)
      if (d.igdb) Object.assign(juego, camposDesdeIgdb(d.igdb))
      else {
        juego.igdb_estado = 'manual'
        juego.portada_url = d.portada_url
      }
      await db.juegos.add(juego)
    } else if (d.igdb && !juego.igdb_id) {
      await db.juegos.update(juego.id, { ...camposDesdeIgdb(d.igdb), actualizado: ahora })
    }
    const p = aplicarCambioEstado(partidaVacia(juego.id, 'Pendiente', ahora), d.estado)
    p.plataforma = d.plataforma
    if (p.fecha_fin) p.anio = Number(p.fecha_fin.slice(0, 4))
    await db.partidas.add(p)
    precargarPortada(juego.portada_url)
    return juego.id
  })
}

export async function nuevaPartida(juegoId: string, plataforma: string, estado: Estado): Promise<string> {
  const p = aplicarCambioEstado(partidaVacia(juegoId, 'Pendiente', ahoraIso()), estado)
  p.plataforma = plataforma
  await db.partidas.add(p)
  return p.id
}

export async function renombrarPlataforma(antes: string, despues: string): Promise<void> {
  const ajustes = await leerAjustes()
  await db.transaction('rw', db.partidas, db.ajustes, async () => {
    await guardarAjuste(
      'plataformas',
      ajustes.plataformas.map((p) => (p === antes ? despues : p)),
    )
    await db.partidas.where('plataforma').equals(antes).modify({ plataforma: despues, actualizado: ahoraIso() })
  })
}
