import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Juego, Partida } from './types'

export interface Datos {
  juegos: Juego[]
  partidas: Partida[]
  porId: Map<string, Juego>
}

/** Todos los juegos y partidas, reactivos a cualquier cambio en IndexedDB. */
export function useDatos(): Datos | undefined {
  return useLiveQuery(async () => {
    const [juegos, partidas] = await Promise.all([db.juegos.toArray(), db.partidas.toArray()])
    return { juegos, partidas, porId: new Map(juegos.map((j) => [j.id, j])) }
  }, [])
}
