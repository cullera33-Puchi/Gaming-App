import { useEffect, useState, type ReactNode } from 'react'
import type { Estado } from '../lib/types'

export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    addEventListener('keydown', tecla)
    document.body.classList.add('sin-scroll')
    return () => {
      removeEventListener('keydown', tecla)
      document.body.classList.remove('sin-scroll')
    }
  }, [onCerrar])
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="hoja-asa" />
        <div className="hoja-cabecera">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </div>
        <div className="hoja-cuerpo">{children}</div>
      </div>
    </div>
  )
}

export function Portada({ url, titulo, tam = 's' }: { url: string | null; titulo: string; tam?: 's' | 'm' | 'l' }) {
  const [fallo, setFallo] = useState(false)
  useEffect(() => setFallo(false), [url])
  if (!url || fallo) {
    const iniciales = titulo
      .split(/\s+/)
      .filter((p) => /^[A-Za-z0-9ÁÉÍÓÚÑ]/.test(p))
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
    return (
      <div className={`portada portada-${tam} portada-vacia`} aria-hidden="true">
        {iniciales}
      </div>
    )
  }
  return <img className={`portada portada-${tam}`} src={url} alt="" loading="lazy" onError={() => setFallo(true)} />
}

export function EtiquetaEstado({ estado }: { estado: Estado }) {
  return <span className={`estado estado-${estado}`}>{estado}</span>
}

export function Chips<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  envolver = true,
}: {
  opciones: readonly T[]
  valor: T | null
  onCambio: (v: T) => void
  etiqueta?: (v: T) => string
  envolver?: boolean
}) {
  return (
    <div className={`chips ${envolver ? 'envolver' : ''}`} role="radiogroup">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={valor === o}
          className={`chip ${valor === o ? 'activo' : ''}`}
          onClick={() => onCambio(o)}
        >
          {etiqueta ? etiqueta(o) : o}
        </button>
      ))}
    </div>
  )
}

export function ChipsMultiples({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly string[]
  valor: string[]
  onCambio: (v: string[]) => void
}) {
  return (
    <div className="chips envolver">
      {opciones.map((o) => {
        const activo = valor.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={activo}
            className={`chip ${activo ? 'activo' : ''}`}
            onClick={() => onCambio(activo ? valor.filter((v) => v !== o) : [...valor, o])}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function Cabecera({ titulo, izquierda, derecha }: { titulo: string; izquierda?: ReactNode; derecha?: ReactNode }) {
  return (
    <header className="cabecera">
      <div className="cabecera-lado">{izquierda}</div>
      <h1>{titulo}</h1>
      <div className="cabecera-lado derecha">{derecha}</div>
    </header>
  )
}

const ICONOS: Record<string, ReactNode> = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  biblioteca: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="16" rx="1" />
      <path d="m17 5.5 3.2-.8 3 14.5-3.2.8z" />
    </>
  ),
  deseados: <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.5 7.6 4 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.3 0 5.8 3.1 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z" />,
  analisis: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  atras: <path d="M15 18 9 12l6-6" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  bandera: <path d="M5 21V4h11l-1.5 4L16 12H5" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  enlace: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
}

export function Icono({ nombre }: { nombre: keyof typeof ICONOS | string }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[nombre]}
    </svg>
  )
}

export function Aviso({ children, tipo = 'info' }: { children: ReactNode; tipo?: 'info' | 'error' | 'ok' }) {
  return <div className={`aviso aviso-${tipo}`}>{children}</div>
}
