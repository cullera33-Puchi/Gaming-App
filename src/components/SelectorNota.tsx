import { formatoNota, NOTA_MAX, NOTA_MIN, NOTA_PASO, redondearNota } from '../lib/nota'

/** Selector de 1 a 10 en pasos de 0,25, con opción de dejarlo sin nota. */
export function SelectorNota({ valor, onCambio }: { valor: number | null; onCambio: (v: number | null) => void }) {
  const actual = valor ?? 7
  return (
    <div className="selector-nota">
      <div className="selector-nota-fila">
        <button type="button" className="btn-icono grande" aria-label="Bajar 0,25" onClick={() => onCambio(redondearNota(actual - NOTA_PASO))}>
          −
        </button>
        <output className={`nota-grande ${valor == null ? 'apagada' : ''}`} aria-live="polite">
          {formatoNota(valor)}
        </output>
        <button type="button" className="btn-icono grande" aria-label="Subir 0,25" onClick={() => onCambio(redondearNota(valor == null ? actual : actual + NOTA_PASO))}>
          +
        </button>
      </div>
      <input
        type="range"
        min={NOTA_MIN}
        max={NOTA_MAX}
        step={NOTA_PASO}
        value={actual}
        aria-label="Nota"
        className={valor == null ? 'apagado' : ''}
        onChange={(e) => onCambio(Number(e.target.value))}
      />
      {valor != null && (
        <button type="button" className="btn fantasma pequeno" onClick={() => onCambio(null)}>
          Quitar nota
        </button>
      )}
    </div>
  )
}
