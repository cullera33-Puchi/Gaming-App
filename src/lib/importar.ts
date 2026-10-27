import { normalizarTitulo, nuevoId } from './texto'
import type { Estado, Juego, Partida } from './types'

export interface FilaHistorico {
  anio: number
  titulo_original: string
  titulo: string
  estado: string
  nota: number | null
  plataforma: string | null
  pendiente_confirmar: boolean
  nota_original_100: number | null
  horas_jugadas?: number | null
}

export interface FilaBacklog {
  titulo: string
  estado: string
  plataforma: string | null
  plataforma_original: string | null
  horas_estimadas_min: number | null
  horas_estimadas_max: number | null
  horas_jugadas: number | null
  revisar: string | null
}

export interface FicheroHistorico {
  version: number
  partidas: FilaHistorico[]
}

export interface FicheroBacklog {
  version: number
  partidas: FilaBacklog[]
}

export interface ResultadoImportacion {
  juegos: Juego[]
  partidas: Partida[]
  plataformas: string[]
}

const ESTADOS_VALIDOS: Estado[] = ['Deseado', 'Pendiente', 'Jugando', 'Pausado', 'Terminado', 'Abandonado']

function estadoValido(valor: string): Estado {
  const e = ESTADOS_VALIDOS.find((x) => x.toLowerCase() === valor.trim().toLowerCase())
  if (!e) throw new Error(`Estado desconocido en la importación: ${valor}`)
  return e
}

export function juegoVacio(titulo: string, ahora: string): Juego {
  return {
    id: nuevoId(),
    titulo,
    titulo_norm: normalizarTitulo(titulo),
    igdb_id: null,
    igdb_estado: 'sin_buscar',
    igdb_propuestas: [],
    igdb_url: null,
    anio_lanzamiento: null,
    portada_url: null,
    descripcion: null,
    generos: [],
    hltb_principal_h: null,
    hltb_extras_h: null,
    hltb_completo_h: null,
    steam_appid: null,
    eshop_nsuid: null,
    enlace_deku: null,
    nota_critica: null,
    fuente_critica: null,
    enlace_hltb: null,
    enlace_metacritic: null,
    creado: ahora,
    actualizado: ahora,
  }
}

export function partidaVacia(juegoId: string, estado: Estado, ahora: string): Partida {
  return {
    id: nuevoId(),
    juego_id: juegoId,
    plataforma: null,
    estado,
    anio: null,
    fecha_inicio: null,
    fecha_fin: null,
    horas: null,
    nota: null,
    completado_100: null,
    resena: null,
    motivo_abandono: [],
    retomar: null,
    horas_estimadas_min: null,
    horas_estimadas_max: null,
    ultima_sesion: null,
    revisar: null,
    origen: 'app',
    titulo_original: null,
    plataforma_original: null,
    nota_original_100: null,
    creado: ahora,
    actualizado: ahora,
  }
}

/**
 * Convierte los dos ficheros de la carga inicial en juegos y partidas.
 * Un juego que aparece varias veces (rejugadas, o en histórico y backlog)
 * se crea una sola vez y recibe una partida por cada aparición.
 */
export function importarDatosIniciales(
  historico: FicheroHistorico,
  backlog: FicheroBacklog,
  ahora = new Date().toISOString(),
): ResultadoImportacion {
  const juegos = new Map<string, Juego>()
  const partidas: Partida[] = []
  const plataformas = new Set<string>()

  const juegoPara = (titulo: string): Juego => {
    const clave = normalizarTitulo(titulo)
    let juego = juegos.get(clave)
    if (!juego) {
      juego = juegoVacio(titulo.trim(), ahora)
      juegos.set(clave, juego)
    }
    return juego
  }

  for (const fila of historico.partidas) {
    const juego = juegoPara(fila.titulo)
    const p = partidaVacia(juego.id, estadoValido(fila.estado), ahora)
    p.origen = 'historico'
    p.anio = fila.anio
    p.nota = fila.nota
    p.horas = fila.horas_jugadas ?? null
    p.plataforma = fila.plataforma
    p.titulo_original = fila.titulo_original
    p.nota_original_100 = fila.nota_original_100
    if (fila.pendiente_confirmar) p.revisar = 'Confirmar estado y nota (marcado como pendiente de confirmar)'
    if (fila.plataforma) plataformas.add(fila.plataforma)
    partidas.push(p)
  }

  for (const fila of backlog.partidas) {
    const juego = juegoPara(fila.titulo)
    const p = partidaVacia(juego.id, estadoValido(fila.estado), ahora)
    p.origen = 'backlog'
    p.plataforma = fila.plataforma
    p.plataforma_original = fila.plataforma_original
    p.horas_estimadas_min = fila.horas_estimadas_min
    p.horas_estimadas_max = fila.horas_estimadas_max
    p.horas = fila.horas_jugadas
    p.revisar = fila.revisar
    if (fila.plataforma) plataformas.add(fila.plataforma)
    partidas.push(p)
  }

  return { juegos: [...juegos.values()], partidas, plataformas: [...plataformas] }
}
