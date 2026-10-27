import Dexie, { type EntityTable } from 'dexie'
import type { Ajuste, Juego, Partida } from './types'

export const db = new Dexie('backlog-juegos') as Dexie & {
  juegos: EntityTable<Juego, 'id'>
  partidas: EntityTable<Partida, 'id'>
  ajustes: EntityTable<Ajuste, 'clave'>
}

db.version(1).stores({
  juegos: 'id, igdb_id, titulo_norm, igdb_estado',
  partidas: 'id, juego_id, estado, plataforma',
  ajustes: 'clave',
})

// Pide al navegador que no borre los datos por falta de espacio.
export async function pedirAlmacenamientoPersistente(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    // Sin soporte: los datos siguen en IndexedDB, solo sin la garantía extra.
  }
}
