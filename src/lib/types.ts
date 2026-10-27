export const ESTADOS = ['Deseado', 'Pendiente', 'Jugando', 'Pausado', 'Terminado', 'Abandonado'] as const
export type Estado = (typeof ESTADOS)[number]

// Estados que se pueden asignar en la fase 1; Deseado llega con la fase 3.
export const ESTADOS_FASE_1: Estado[] = ['Pendiente', 'Jugando', 'Pausado', 'Terminado', 'Abandonado']

export const MOTIVOS_ABANDONO = [
  'Lento',
  'Repetitivo',
  'La historia no engancha',
  'Demasiado difícil',
  'Demasiado fácil',
  'Abrumador',
  'Falta de tiempo',
  'Desplazado por otro juego',
  'Otro',
] as const

export type Retomar = 'si' | 'no' | 'quiza'

export const PLATAFORMAS_INICIALES = ['PS5 Pro', 'Switch 2', 'AYN Thor', 'ROG Ally', 'Retroid']

/**
 * Situación del juego frente a IGDB:
 * sin_buscar: aún no se ha consultado.
 * propuesto: hay candidatos, pero ninguno claro; va a la lista de revisión.
 * sin_resultados: IGDB no devolvió nada; va a la lista de revisión.
 * confirmado: vinculado a una ficha de IGDB.
 * manual: el usuario decidió dejarlo sin ficha de IGDB.
 */
export type EstadoIgdb = 'sin_buscar' | 'propuesto' | 'sin_resultados' | 'confirmado' | 'manual'

export interface IgdbJuego {
  igdb_id: number
  titulo: string
  anio: number | null
  portada_url: string | null
  descripcion: string | null
  generos: string[]
  plataformas: string[]
  nota_critica: number | null
  num_criticas: number | null
  popularidad: number
  url: string | null
}

export interface Juego {
  id: string
  titulo: string
  titulo_norm: string
  igdb_id: number | null
  igdb_estado: EstadoIgdb
  igdb_propuestas: IgdbJuego[]
  igdb_url: string | null
  anio_lanzamiento: number | null
  portada_url: string | null
  descripcion: string | null
  generos: string[]
  hltb_principal_h: number | null
  hltb_extras_h: number | null
  hltb_completo_h: number | null
  steam_appid: string | null
  eshop_nsuid: string | null
  enlace_deku: string | null
  nota_critica: number | null
  fuente_critica: string | null
  enlace_hltb: string | null
  enlace_metacritic: string | null
  creado: string
  actualizado: string
}

export type OrigenPartida = 'historico' | 'backlog' | 'app'

export interface Partida {
  id: string
  juego_id: string
  plataforma: string | null
  estado: Estado
  /** Año de la partida cuando no hay fechas exactas (histórico). */
  anio: number | null
  fecha_inicio: string | null
  fecha_fin: string | null
  horas: number | null
  nota: number | null
  completado_100: boolean | null
  resena: string | null
  motivo_abandono: string[]
  retomar: Retomar | null
  horas_estimadas_min: number | null
  horas_estimadas_max: number | null
  ultima_sesion: string | null
  /** Aviso pendiente de confirmar; mientras tenga texto aparece en la lista de revisión. */
  revisar: string | null
  origen: OrigenPartida
  titulo_original: string | null
  plataforma_original: string | null
  nota_original_100: number | null
  creado: string
  actualizado: string
}

export interface Ajuste {
  clave: string
  valor: unknown
}

export interface Exportacion {
  formato: 'backlog-juegos'
  version: 1
  exportado: string
  juegos: Juego[]
  partidas: Partida[]
  ajustes: Ajuste[]
}
