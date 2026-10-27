import { useMemo, useState } from 'react'
import { Cabecera, EtiquetaEstado, Icono, Portada } from '../components/comunes'
import { asignarPlataforma } from '../lib/acciones'
import { useAjustes } from '../lib/ajustes'
import { anioPartida, claveFecha } from '../lib/consultas'
import { useDatos } from '../lib/datos'
import { formatoNota } from '../lib/nota'
import { ir } from '../lib/router'
import { normalizarTitulo } from '../lib/texto'
import { ESTADOS_FASE_1, type Estado } from '../lib/types'

type Orden = 'titulo' | 'nota' | 'fecha'
const SIN_PLATAFORMA = '__sin__'

interface Filtros {
  estado: Estado | 'Todos'
  texto: string
  plataforma: string
  genero: string
  anio: string
  orden: Orden
}

// Se conservan al salir y volver a la pantalla.
let filtrosGuardados: Filtros = { estado: 'Todos', texto: '', plataforma: '', genero: '', anio: '', orden: 'titulo' }

export function abrirBibliotecaSinPlataforma() {
  filtrosGuardados = { ...filtrosGuardados, estado: 'Todos', plataforma: SIN_PLATAFORMA, texto: '' }
  ir('biblioteca')
}

export function Biblioteca() {
  const datos = useDatos()
  const ajustes = useAjustes()
  const [f, setF] = useState<Filtros>(filtrosGuardados)
  const [seleccion, setSeleccion] = useState<Set<string> | null>(null)
  const [plataformaLote, setPlataformaLote] = useState('')

  const cambiar = (c: Partial<Filtros>) => {
    const n = { ...f, ...c }
    filtrosGuardados = n
    setF(n)
  }

  const opciones = useMemo(() => {
    if (!datos) return { generos: [], anios: [] }
    const generos = new Set<string>()
    datos.juegos.forEach((j) => j.generos.forEach((g) => generos.add(g)))
    const anios = new Set<number>()
    datos.partidas.forEach((p) => {
      const a = anioPartida(p)
      if (a != null) anios.add(a)
    })
    return { generos: [...generos].sort((a, b) => a.localeCompare(b, 'es')), anios: [...anios].sort((a, b) => b - a) }
  }, [datos])

  const filas = useMemo(() => {
    if (!datos) return []
    const texto = normalizarTitulo(f.texto)
    const lista = datos.partidas
      .map((p) => ({ p, j: datos.porId.get(p.juego_id)! }))
      .filter(({ p, j }) => {
        if (!j) return false
        if (f.estado !== 'Todos' && p.estado !== f.estado) return false
        if (texto && !j.titulo_norm.includes(texto)) return false
        if (f.plataforma === SIN_PLATAFORMA && p.plataforma) return false
        if (f.plataforma && f.plataforma !== SIN_PLATAFORMA && p.plataforma !== f.plataforma) return false
        if (f.genero && !j.generos.includes(f.genero)) return false
        if (f.anio && String(anioPartida(p)) !== f.anio) return false
        return true
      })
    lista.sort((a, b) => {
      if (f.orden === 'nota') return (b.p.nota ?? -1) - (a.p.nota ?? -1) || a.j.titulo.localeCompare(b.j.titulo, 'es')
      if (f.orden === 'fecha') return claveFecha(b.p).localeCompare(claveFecha(a.p)) || a.j.titulo.localeCompare(b.j.titulo, 'es')
      return a.j.titulo.localeCompare(b.j.titulo, 'es')
    })
    return lista
  }, [datos, f])

  if (!datos || !ajustes) return null

  const conteo = (e: Estado | 'Todos') => (e === 'Todos' ? datos.partidas.length : datos.partidas.filter((p) => p.estado === e).length)

  const alternar = (id: string) => {
    const s = new Set(seleccion)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSeleccion(s)
  }

  const aplicarLote = async () => {
    if (!seleccion?.size || !plataformaLote) return
    await asignarPlataforma([...seleccion], plataformaLote)
    setSeleccion(new Set())
  }

  return (
    <>
      <Cabecera
        titulo="Biblioteca"
        derecha={
          <button className="btn pequeno fantasma" onClick={() => setSeleccion(seleccion ? null : new Set())}>
            {seleccion ? 'Cancelar' : 'Seleccionar'}
          </button>
        }
      />
      <div className="filtros">
        <label className="buscador">
          <Icono nombre="buscar" />
          <input type="search" placeholder="Buscar título" value={f.texto} onChange={(e) => cambiar({ texto: e.target.value })} />
        </label>
        <div className="chips">
          {(['Todos', ...ESTADOS_FASE_1] as const).map((e) => (
            <button key={e} className={`chip ${f.estado === e ? 'activo' : ''}`} onClick={() => cambiar({ estado: e })}>
              {e} <span className="chip-num">{conteo(e)}</span>
            </button>
          ))}
        </div>
        <div className="selects">
          <select aria-label="Plataforma" value={f.plataforma} onChange={(e) => cambiar({ plataforma: e.target.value })}>
            <option value="">Plataforma</option>
            <option value={SIN_PLATAFORMA}>Sin plataforma</option>
            {ajustes.plataformas.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select aria-label="Género" value={f.genero} onChange={(e) => cambiar({ genero: e.target.value })}>
            <option value="">Género</option>
            {opciones.generos.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select aria-label="Año" value={f.anio} onChange={(e) => cambiar({ anio: e.target.value })}>
            <option value="">Año</option>
            {opciones.anios.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select aria-label="Orden" value={f.orden} onChange={(e) => cambiar({ orden: e.target.value as Orden })}>
            <option value="titulo">Por título</option>
            <option value="nota">Por nota</option>
            <option value="fecha">Por fecha</option>
          </select>
        </div>
      </div>

      {seleccion && (
        <div className="barra-lote">
          <button className="btn pequeno fantasma" onClick={() => setSeleccion(new Set(filas.map(({ p }) => p.id)))}>
            Todos ({filas.length})
          </button>
          <select aria-label="Plataforma para la selección" value={plataformaLote} onChange={(e) => setPlataformaLote(e.target.value)}>
            <option value="">Plataforma…</option>
            {ajustes.plataformas.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button className="btn pequeno primario" disabled={!seleccion.size || !plataformaLote} onClick={aplicarLote}>
            Asignar a {seleccion.size}
          </button>
        </div>
      )}

      <p className="secundario contador">{filas.length} partidas</p>
      <ul className="lista">
        {filas.map(({ p, j }) => {
          const anio = anioPartida(p)
          const marcada = seleccion?.has(p.id) ?? false
          return (
            <li key={p.id}>
              <button
                className={`fila ${marcada ? 'marcada' : ''}`}
                onClick={() => (seleccion ? alternar(p.id) : ir(`juego/${j.id}`))}
                aria-pressed={seleccion ? marcada : undefined}
              >
                {seleccion && <span className={`casilla ${marcada ? 'activa' : ''}`} aria-hidden="true" />}
                <Portada url={j.portada_url} titulo={j.titulo} />
                <span className="fila-texto">
                  <span className="fila-titulo">{j.titulo}</span>
                  <span className="secundario">
                    {p.plataforma ?? <em>Sin plataforma</em>}
                    {anio != null && `, ${anio}`}
                    {p.revisar && ', por revisar'}
                  </span>
                </span>
                <span className="fila-derecha">
                  <EtiquetaEstado estado={p.estado} />
                  {p.nota != null && <span className="nota">{formatoNota(p.nota)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
