import { useSyncExternalStore } from 'react'

export type Ruta =
  | { pantalla: 'inicio' }
  | { pantalla: 'biblioteca' }
  | { pantalla: 'deseados' }
  | { pantalla: 'analisis' }
  | { pantalla: 'ajustes' }
  | { pantalla: 'alta' }
  | { pantalla: 'revision' }
  | { pantalla: 'juego'; id: string }

function leer(): Ruta {
  const partes = location.hash.replace(/^#\/?/, '').split('/')
  switch (partes[0]) {
    case 'biblioteca':
    case 'deseados':
    case 'analisis':
    case 'ajustes':
    case 'alta':
    case 'revision':
      return { pantalla: partes[0] }
    case 'juego':
      if (partes[1]) return { pantalla: 'juego', id: decodeURIComponent(partes[1]) }
      return { pantalla: 'inicio' }
    default:
      return { pantalla: 'inicio' }
  }
}

let actual = leer()
let hashActual = location.hash
addEventListener('hashchange', () => {
  actual = leer()
  hashActual = location.hash
})

export function useRuta(): Ruta {
  return useSyncExternalStore(
    (f) => {
      addEventListener('hashchange', f)
      return () => removeEventListener('hashchange', f)
    },
    () => (location.hash === hashActual ? actual : ((hashActual = location.hash), (actual = leer()))),
  )
}

export function ir(ruta: string) {
  location.hash = '#/' + ruta
}

export function volver(porDefecto = 'biblioteca') {
  if (history.length > 1) history.back()
  else ir(porDefecto)
}
