import { useState } from 'react'
import { Aviso, Cabecera, EtiquetaEstado, Icono, Portada } from '../components/comunes'
import { HojaAbandono, HojaHoras } from '../components/HojasPartida'
import { abandonar, cambiarEstado, cargarDatosIniciales } from '../lib/acciones'
import { calcularRevision, diasDesde, resumenAnio, totalRevision } from '../lib/consultas'
import { useDatos } from '../lib/datos'
import { formatoDecimal } from '../lib/nota'
import { ir } from '../lib/router'
import { ESTADOS_FASE_1, type Estado, type Partida } from '../lib/types'

function textoDias(dias: number | null): string {
  if (dias == null) return 'Sin sesiones registradas'
  if (dias === 0) return 'Última sesión hoy'
  if (dias === 1) return 'Última sesión ayer'
  return `Hace ${dias} días`
}

function enumerar(partes: string[]): string {
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : (partes[0] ?? '')
}

export function Inicio() {
  const datos = useDatos()
  const [horasDe, setHorasDe] = useState<Partida | null>(null)
  const [abandono, setAbandono] = useState<{ partida: Partida; antes: Partida } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!datos) return null
  const { partidas, porId } = datos

  if (partidas.length === 0) {
    return (
      <>
        <Cabecera titulo="Inicio" grande />
        <section className="vacio">
          <h2>Sin datos todavía</h2>
          <p>Carga el histórico 2021 a 2026 y el backlog para empezar.</p>
          <button
            className="btn primario"
            disabled={cargando}
            onClick={async () => {
              setCargando(true)
              setError(null)
              try {
                await cargarDatosIniciales()
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              } finally {
                setCargando(false)
              }
            }}
          >
            {cargando ? 'Cargando…' : 'Cargar histórico y backlog'}
          </button>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </section>
      </>
    )
  }

  const anio = new Date().getFullYear()
  const resumen = resumenAnio(partidas, anio)
  const enCurso = partidas.filter((p) => p.estado === 'Jugando')
  const pausados = partidas.filter((p) => p.estado === 'Pausado')
  const revision = calcularRevision(datos.juegos, partidas)
  const pendientesRevision = totalRevision(revision) + revision.sinBuscar.length
  const partesRevision = [
    [revision.sinBuscar.length, 'sin buscar en IGDB'],
    [revision.sinFichaClara.length, 'sin ficha clara'],
    [revision.sinPlataforma.length, 'sin plataforma'],
    [revision.porConfirmar.length, 'por confirmar'],
  ]
    .filter(([n]) => n)
    .map(([n, t]) => `${n} ${t}`)

  const pulsarAbandonar = async (p: Partida) => {
    const antes = await abandonar(p)
    setAbandono({ partida: { ...p, estado: 'Abandonado' }, antes })
  }

  const tarjeta = (p: Partida) => {
    const juego = porId.get(p.juego_id)
    if (!juego) return null
    return (
      <article key={p.id} className="tarjeta en-curso">
        <button className="en-curso-cabecera" onClick={() => ir(`juego/${juego.id}`)}>
          <Portada url={juego.portada_url} titulo={juego.titulo} tam="m" />
          <div className="en-curso-texto">
            <h3>{juego.titulo}</h3>
            <p className="secundario">
              {p.plataforma ?? 'Sin plataforma'}
              {p.horas != null && `, ${formatoDecimal(p.horas)} h`}
            </p>
            <p className="secundario">{textoDias(diasDesde(p.ultima_sesion))}</p>
          </div>
        </button>
        <div className="en-curso-acciones">
          <button className="btn pequeno gris" onClick={() => setHorasDe(p)}>
            Horas
          </button>
          <select
            className="menu"
            aria-label="Cambiar estado"
            value={p.estado}
            onChange={(e) => cambiarEstado(p, e.target.value as Estado)}
          >
            {ESTADOS_FASE_1.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <button className="btn pequeno gris peligro-texto" onClick={() => pulsarAbandonar(p)}>
            Abandonar
          </button>
        </div>
      </article>
    )
  }

  return (
    <>
      <Cabecera titulo="Inicio" grande />
      <section className="seccion">
        <h2>Resumen {anio}</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-valor">{resumen.terminados}</span>
            <span className="stat-etiqueta">Terminados</span>
          </div>
          <div className="stat">
            <span className="stat-valor">{resumen.abandonados}</span>
            <span className="stat-etiqueta">Abandonados</span>
          </div>
          <div className="stat">
            <span className="stat-valor">{formatoDecimal(resumen.notaMedia, 2)}</span>
            <span className="stat-etiqueta">Nota media</span>
          </div>
        </div>
      </section>

      {pendientesRevision > 0 && (
        <button className="aviso aviso-info aviso-boton" onClick={() => ir('revision')}>
          <span>
            <strong>Carga inicial por completar.</strong> {enumerar(partesRevision)}.
          </span>
          <Icono nombre="chevron" />
        </button>
      )}

      <section className="seccion">
        <h2>Jugando</h2>
        {enCurso.length === 0 ? <p className="secundario">Nada en curso. Cambia un pendiente a Jugando desde su ficha.</p> : enCurso.map(tarjeta)}
      </section>

      {pausados.length > 0 && (
        <section className="seccion">
          <h2>Pausados</h2>
          <ul className="lista">
            {pausados.map((p) => {
              const juego = porId.get(p.juego_id)
              if (!juego) return null
              return (
                <li key={p.id}>
                  <button className="fila" onClick={() => ir(`juego/${juego.id}`)}>
                    <Portada url={juego.portada_url} titulo={juego.titulo} />
                    <span className="fila-texto">
                      <span className="fila-titulo">{juego.titulo}</span>
                      <span className="secundario">
                        {p.plataforma ?? 'Sin plataforma'}
                        {p.horas != null && `, ${formatoDecimal(p.horas)} h`}
                      </span>
                    </span>
                    <EtiquetaEstado estado={p.estado} />
                    <Icono nombre="chevron" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {horasDe && <HojaHoras partida={horasDe} onCerrar={() => setHorasDe(null)} />}
      {abandono && <HojaAbandono partida={abandono.partida} antes={abandono.antes} onCerrar={() => setAbandono(null)} />}
    </>
  )
}
