import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { PLATAFORMAS_INICIALES } from './types'

export interface Ajustes {
  plataformas: string[]
  horas_semanales: number | null
  intermediario_url: string
  intermediario_token: string
  carga_inicial: string | null
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  plataformas: PLATAFORMAS_INICIALES,
  horas_semanales: null,
  intermediario_url: '',
  intermediario_token: '',
  carga_inicial: null,
}

export async function leerAjustes(): Promise<Ajustes> {
  const filas = await db.ajustes.toArray()
  const valores: Record<string, unknown> = {}
  for (const f of filas) valores[f.clave] = f.valor
  return { ...AJUSTES_POR_DEFECTO, ...valores } as Ajustes
}

export async function guardarAjuste<K extends keyof Ajustes>(clave: K, valor: Ajustes[K]): Promise<void> {
  await db.ajustes.put({ clave, valor })
}

export function useAjustes(): Ajustes | undefined {
  return useLiveQuery(leerAjustes, [])
}
