import { useSyncExternalStore } from 'react'
import { db } from './db'
import { buscarVariosEnIgdb, camposDesdeIgdb, decidirCoincidencia } from './igdb'
import { ahoraIso } from './texto'

export interface ProgresoEmparejado {
  activo: boolean
  total: number
  hechos: number
  confirmados: number
  aRevisar: number
  error: string | null
}

let progreso: ProgresoEmparejado = { activo: false, total: 0, hechos: 0, confirmados: 0, aRevisar: 0, error: null }
const oyentes = new Set<() => void>()

function publicar(cambios: Partial<ProgresoEmparejado>) {
  progreso = { ...progreso, ...cambios }
  oyentes.forEach((f) => f())
}

export function useProgresoEmparejado(): ProgresoEmparejado {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => progreso,
  )
}

const LOTE = 10
const PAUSA_MS = 350

/** Descarga la portada para que quede en la caché del service worker. */
export function precargarPortada(url: string | null) {
  if (url) new Image().src = url
}

/**
 * Busca en IGDB todos los juegos que aún no se han consultado.
 * Sigue en marcha aunque se cambie de pantalla.
 */
export async function emparejarPendientes(): Promise<void> {
  if (progreso.activo) return
  const pendientes = await db.juegos.where('igdb_estado').equals('sin_buscar').toArray()
  publicar({ activo: true, total: pendientes.length, hechos: 0, confirmados: 0, aRevisar: 0, error: null })
  try {
    for (let i = 0; i < pendientes.length; i += LOTE) {
      const lote = pendientes.slice(i, i + LOTE)
      const resultados = await buscarVariosEnIgdb(lote.map((j) => j.titulo))
      let confirmados = 0
      let aRevisar = 0
      await db.transaction('rw', db.juegos, async () => {
        for (let k = 0; k < lote.length; k++) {
          const juego = lote[k]
          const { elegido, candidatos } = decidirCoincidencia(juego.titulo, resultados[k] ?? [])
          if (elegido) {
            confirmados++
            await db.juegos.update(juego.id, { ...camposDesdeIgdb(elegido), actualizado: ahoraIso() })
            precargarPortada(elegido.portada_url)
          } else {
            aRevisar++
            await db.juegos.update(juego.id, {
              igdb_estado: candidatos.length ? 'propuesto' : 'sin_resultados',
              igdb_propuestas: candidatos.slice(0, 6),
              actualizado: ahoraIso(),
            })
          }
        }
      })
      publicar({
        hechos: progreso.hechos + lote.length,
        confirmados: progreso.confirmados + confirmados,
        aRevisar: progreso.aRevisar + aRevisar,
      })
      if (i + LOTE < pendientes.length) await new Promise((r) => setTimeout(r, PAUSA_MS))
    }
  } catch (e) {
    publicar({ error: e instanceof Error ? e.message : String(e) })
  } finally {
    publicar({ activo: false })
  }
}
