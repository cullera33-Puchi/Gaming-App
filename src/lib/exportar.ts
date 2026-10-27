import { db } from './db'
import type { Exportacion } from './types'

export async function crearExportacion(): Promise<Exportacion> {
  const [juegos, partidas, ajustes] = await Promise.all([db.juegos.toArray(), db.partidas.toArray(), db.ajustes.toArray()])
  return { formato: 'backlog-juegos', version: 1, exportado: new Date().toISOString(), juegos, partidas, ajustes }
}

/** Descarga el JSON o, en el móvil, lo ofrece en la hoja de compartir. */
export async function exportarJson(): Promise<void> {
  const datos = await crearExportacion()
  const nombre = `backlog-juegos-${datos.exportado.slice(0, 10)}.json`
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const fichero = new File([blob], nombre, { type: 'application/json' })
  if (navigator.canShare?.({ files: [fichero] })) {
    try {
      await navigator.share({ files: [fichero], title: nombre })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function validarExportacion(datos: unknown): Exportacion {
  const d = datos as Partial<Exportacion>
  if (d?.formato !== 'backlog-juegos' || d.version !== 1 || !Array.isArray(d.juegos) || !Array.isArray(d.partidas)) {
    throw new Error('El fichero no es una copia de esta app')
  }
  const ids = new Set(d.juegos.map((j) => j.id))
  const huerfana = d.partidas.find((p) => !ids.has(p.juego_id))
  if (huerfana) throw new Error('La copia tiene partidas sin juego asociado')
  return { ...d, ajustes: Array.isArray(d.ajustes) ? d.ajustes : [] } as Exportacion
}

/** Sustituye todos los datos del dispositivo por los de la copia. */
export async function restaurarCopia(datos: Exportacion): Promise<void> {
  await db.transaction('rw', db.juegos, db.partidas, db.ajustes, async () => {
    await Promise.all([db.juegos.clear(), db.partidas.clear(), db.ajustes.clear()])
    await db.juegos.bulkAdd(datos.juegos)
    await db.partidas.bulkAdd(datos.partidas)
    await db.ajustes.bulkPut(datos.ajustes)
  })
}

export async function borrarTodo(): Promise<void> {
  await db.transaction('rw', db.juegos, db.partidas, db.ajustes, async () => {
    await Promise.all([db.juegos.clear(), db.partidas.clear(), db.ajustes.clear()])
  })
}
