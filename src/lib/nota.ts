export const NOTA_MIN = 1
export const NOTA_MAX = 10
export const NOTA_PASO = 0.25

/** Redondea al 0,25 más cercano dentro del rango 1 a 10. */
export function redondearNota(valor: number): number {
  const r = Math.round(valor / NOTA_PASO) * NOTA_PASO
  return Math.min(NOTA_MAX, Math.max(NOTA_MIN, r))
}

/** Convierte una nota sobre 100 a la escala de 10 en pasos de 0,25. */
export function notaDesde100(valor: number): number {
  return redondearNota(valor / 10)
}

/** Formato español: 7,25 o 9. */
export function formatoNota(nota: number | null | undefined): string {
  if (nota == null) return 'Sin nota'
  return nota.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

export function formatoDecimal(valor: number | null | undefined, decimales = 1): string {
  if (valor == null || Number.isNaN(valor)) return '-'
  return valor.toLocaleString('es-ES', { maximumFractionDigits: decimales })
}

export function esNotaValida(nota: number): boolean {
  return nota >= NOTA_MIN && nota <= NOTA_MAX && Number.isInteger(nota / NOTA_PASO)
}
