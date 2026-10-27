export const MEDIOS = [
  { nombre: 'Vandal', dominio: 'vandal.elespanol.com' },
  { nombre: '3DJuegos', dominio: '3djuegos.com' },
  { nombre: 'Eurogamer', dominio: 'eurogamer.es' },
  { nombre: 'IGN España', dominio: 'es.ign.com' },
  { nombre: 'Meristation', dominio: 'as.com/meristation' },
  { nombre: 'Hobby Consolas', dominio: 'hobbyconsolas.com' },
]

/** Búsqueda del título limitada a un medio, sin depender del buscador de cada web. */
export function enlaceMedio(titulo: string, dominio: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${titulo}" site:${dominio}`)}`
}

/** Deku Deals: el enlace directo guardado o, si no hay, la búsqueda por título. */
export function enlaceDeku(titulo: string, enlaceGuardado: string | null): string {
  return enlaceGuardado ?? `https://www.dekudeals.com/search?q=${encodeURIComponent(titulo)}&country=es`
}

export function esEnlaceDekuValido(url: string): boolean {
  return /^https:\/\/www\.dekudeals\.com\/items\/[^/?#]+/.test(url.trim())
}
