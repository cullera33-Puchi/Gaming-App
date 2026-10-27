import { useState } from 'react'
import { buscarEnIgdb, IntermediarioNoConfigurado } from '../lib/igdb'
import type { IgdbJuego } from '../lib/types'
import { Aviso, Icono, Portada } from './comunes'

export function ResultadoIgdb({ r, onElegir }: { r: IgdbJuego; onElegir: (r: IgdbJuego) => void }) {
  return (
    <li>
      <button className="fila" onClick={() => onElegir(r)}>
        <Portada url={r.portada_url} titulo={r.titulo} />
        <span className="fila-texto">
          <span className="fila-titulo">{r.titulo}</span>
          <span className="secundario">
            {[r.anio, r.plataformas.slice(0, 4).join(', ')].filter(Boolean).join(', ')}
          </span>
        </span>
      </button>
    </li>
  )
}

/** Búsqueda en IGDB a través del intermediario. */
export function BuscadorIgdb({
  tituloInicial = '',
  onElegir,
  onSinIntermediario,
}: {
  tituloInicial?: string
  onElegir: (r: IgdbJuego) => void
  onSinIntermediario?: () => void
}) {
  const [q, setQ] = useState(tituloInicial)
  const [resultados, setResultados] = useState<IgdbJuego[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = async () => {
    if (!q.trim()) return
    setBuscando(true)
    setError(null)
    try {
      setResultados(await buscarEnIgdb(q.trim()))
    } catch (e) {
      if (e instanceof IntermediarioNoConfigurado) onSinIntermediario?.()
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="buscador-igdb">
      <form
        className="buscador"
        onSubmit={(e) => {
          e.preventDefault()
          buscar()
        }}
      >
        <Icono nombre="buscar" />
        <input type="search" placeholder="Título del juego" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button className="btn pequeno primario" disabled={buscando || !q.trim()}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {resultados && resultados.length === 0 && <p className="secundario">IGDB no ha encontrado nada con ese título.</p>}
      {resultados && resultados.length > 0 && (
        <ul className="lista">
          {resultados.map((r) => (
            <ResultadoIgdb key={r.igdb_id} r={r} onElegir={onElegir} />
          ))}
        </ul>
      )}
    </div>
  )
}
