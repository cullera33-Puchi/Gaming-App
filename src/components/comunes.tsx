import { useEffect, useState, type ReactNode } from 'react'
import type { Estado } from '../lib/types'

/** Indica si la página se ha desplazado más allá del umbral (para plegar el título grande). */
function useDesplazado(umbral: number): boolean {
  const [desplazado, setDesplazado] = useState(() => scrollY > umbral)
  useEffect(() => {
    const f = () => setDesplazado(scrollY > umbral)
    f()
    addEventListener('scroll', f, { passive: true })
    return () => removeEventListener('scroll', f)
  }, [umbral])
  return desplazado
}

/**
 * Barra de navegación al estilo iOS: botones de cristal arriba y, en las pantallas
 * principales, título grande que se pliega en la barra al hacer scroll.
 */
export function Cabecera({
  titulo,
  grande = false,
  izquierda,
  derecha,
}: {
  titulo: string
  grande?: boolean
  izquierda?: ReactNode
  derecha?: ReactNode
}) {
  const desplazado = useDesplazado(grande ? 40 : 4)
  return (
    <>
      <header className={`barra-nav ${desplazado ? 'desplazada' : ''}`}>
        <div className="barra-nav-lado">{izquierda}</div>
        <div className={`titulo-compacto ${grande && !desplazado ? 'oculto' : ''}`} aria-hidden={grande}>
          {titulo}
        </div>
        <div className="barra-nav-lado derecha">{derecha}</div>
      </header>
      {grande ? <h1 className="titulo-grande">{titulo}</h1> : <h1 className="solo-lector">{titulo}</h1>}
    </>
  )
}

export function BotonAtras({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-nav vidrio" onClick={onClick} aria-label="Volver">
      <Icono nombre="atras" />
    </button>
  )
}

/**
 * Hoja inferior al estilo iOS: flota separada de los bordes, con ✕ a la izquierda
 * y, si hay acción principal, ✓ a la derecha.
 */
export function Hoja({
  titulo,
  onCerrar,
  onConfirmar,
  confirmarDesactivado = false,
  children,
}: {
  titulo: string
  onCerrar: () => void
  onConfirmar?: () => void
  confirmarDesactivado?: boolean
  children: ReactNode
}) {
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
          <button className="btn-nav vidrio" onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
          <h2>{titulo}</h2>
          {onConfirmar ? (
            <button className="btn-nav prominente" onClick={onConfirmar} disabled={confirmarDesactivado} aria-label="Guardar">
              <Icono nombre="ok" />
            </button>
          ) : (
            <span className="btn-nav-hueco" />
          )}
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

/** Interruptor de iOS sobre un checkbox nativo. */
export function Interruptor({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <label className="fila-interruptor">
      <span>{etiqueta}</span>
      <input type="checkbox" role="switch" className="interruptor" checked={valor} onChange={(e) => onCambio(e.target.checked)} />
    </label>
  )
}

// Iconos en la línea de SF Symbols. Los de la barra de pestañas van rellenos.
const ICONOS: Record<string, ReactNode> = {
  inicio: (
    <path
      fill="currentColor"
      stroke="none"
      d="M11.3 2.7a1 1 0 0 1 1.4 0l8.6 8a1 1 0 0 1-1.3 1.5l-.5-.4V20a2 2 0 0 1-2 2h-3.3v-6a1 1 0 0 0-1-1h-2.4a1 1 0 0 0-1 1v6H6.5a2 2 0 0 1-2-2v-8.2l-.5.4a1 1 0 0 1-1.3-1.5z"
    />
  ),
  biblioteca: (
    <g fill="currentColor" stroke="none">
      <rect x="2.5" y="3" width="5" height="18" rx="1.4" />
      <rect x="9" y="5" width="5" height="16" rx="1.4" />
      <rect x="15.2" y="4.6" width="5" height="16.4" rx="1.4" transform="rotate(-12 17.7 12.8)" />
    </g>
  ),
  deseados: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 21s-8.2-5-9.8-10.2C1 6.9 3.6 3.6 7.1 3.6c2.1 0 3.7 1.1 4.9 2.8 1.2-1.7 2.8-2.8 4.9-2.8 3.5 0 6.1 3.3 4.9 7.2C20.2 16 12 21 12 21z"
    />
  ),
  analisis: (
    <g fill="currentColor" stroke="none">
      <rect x="3" y="12" width="4.6" height="9" rx="1.3" />
      <rect x="9.7" y="4" width="4.6" height="17" rx="1.3" />
      <rect x="16.4" y="8" width="4.6" height="13" rx="1.3" />
    </g>
  ),
  ajustes: (
    <path
      fill="currentColor"
      stroke="none"
      fillRule="evenodd"
      d="M10.3 2h3.4l.6 2.6c.6.2 1.1.5 1.6.9l2.5-.8 1.7 2.9-1.9 1.8c.1.6.1 1.2 0 1.8l1.9 1.8-1.7 2.9-2.5-.8c-.5.4-1 .7-1.6.9l-.6 2.6h-3.4l-.6-2.6c-.6-.2-1.1-.5-1.6-.9l-2.5.8-1.7-2.9 1.9-1.8a6 6 0 0 1 0-1.8L3.9 7.6l1.7-2.9 2.5.8c.5-.4 1-.7 1.6-.9zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z"
      transform="translate(0 1)"
    />
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  ok: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  atras: <path d="M15 5 8 12l7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  enlace: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  menu: <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />,
}

export function Icono({ nombre }: { nombre: keyof typeof ICONOS | string }) {
  return (
    <svg
      className={`icono icono-${nombre}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre]}
    </svg>
  )
}

export function Aviso({ children, tipo = 'info' }: { children: ReactNode; tipo?: 'info' | 'error' | 'ok' }) {
  return <div className={`aviso aviso-${tipo}`}>{children}</div>
}
