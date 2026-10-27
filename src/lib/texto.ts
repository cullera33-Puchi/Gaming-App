/** Normaliza un título para comparar: minúsculas, sin acentos ni signos. */
export function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Año entre paréntesis al final del título, como en "God of War (2018)". */
export function anioEnTitulo(titulo: string): number | null {
  const m = titulo.match(/\((\d{4})\)\s*$/)
  return m ? Number(m[1]) : null
}

/** Título sin el año final entre paréntesis. */
export function tituloSinAnio(titulo: string): string {
  return titulo.replace(/\s*\(\d{4}\)\s*$/, '')
}

function bigramas(texto: string): Map<string, number> {
  const s = texto.replace(/ /g, '')
  const mapa = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const b = s.slice(i, i + 2)
    mapa.set(b, (mapa.get(b) ?? 0) + 1)
  }
  return mapa
}

/** Coeficiente de Dice sobre bigramas: 1 es idéntico, 0 sin parecido. */
export function similitud(a: string, b: string): number {
  const na = normalizarTitulo(a)
  const nb = normalizarTitulo(b)
  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return 0
  const ba = bigramas(na)
  const bb = bigramas(nb)
  let comunes = 0
  let total = 0
  for (const n of ba.values()) total += n
  for (const n of bb.values()) total += n
  for (const [b, n] of ba) comunes += Math.min(n, bb.get(b) ?? 0)
  return (2 * comunes) / total
}

export function nuevoId(): string {
  return crypto.randomUUID()
}

export function ahoraIso(): string {
  return new Date().toISOString()
}

export function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}
