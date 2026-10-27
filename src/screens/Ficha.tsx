import { useState } from 'react'
import { BuscadorIgdb, ResultadoIgdb } from '../components/BuscadorIgdb'
import { Aviso, Cabecera, Chips, EtiquetaEstado, Hoja, Icono, Portada } from '../components/comunes'
import { EditorPartida, HojaAbandono, HojaHoras } from '../components/HojasPartida'
import {
  abandonar,
  actualizarJuego,
  borrarPartida,
  dejarSinIgdb,
  nuevaPartida,
  vincularIgdb,
} from '../lib/acciones'
import { useAjustes } from '../lib/ajustes'
import { anioPartida, claveFecha } from '../lib/consultas'
import { useDatos } from '../lib/datos'
import { enlaceDeku, enlaceMedio, esEnlaceDekuValido, MEDIOS } from '../lib/enlaces'
import { formatoDecimal, formatoNota } from '../lib/nota'
import { volver } from '../lib/router'
import { ESTADOS_FASE_1, type Estado, type Juego, type Partida } from '../lib/types'
import { CampoPortada } from './Alta'

const RETOMAR = { si: 'Sí', no: 'No', quiza: 'Quizá' }

function fechasPartida(p: Partida): string {
  const f = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  if (p.fecha_inicio && p.fecha_fin) return `${f(p.fecha_inicio)} a ${f(p.fecha_fin)}`
  if (p.fecha_fin) return `Fin ${f(p.fecha_fin)}`
  if (p.fecha_inicio) return `Desde ${f(p.fecha_inicio)}`
  const a = anioPartida(p)
  return a != null ? String(a) : ''
}

function HojaNuevaPartida({ juego, onCerrar }: { juego: Juego; onCerrar: () => void }) {
  const ajustes = useAjustes()
  const [plataforma, setPlataforma] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('Jugando')
  return (
    <Hoja titulo="Nueva partida" onCerrar={onCerrar}>
      <p className="secundario">{juego.titulo}</p>
      <div className="campo">
        <span className="etiqueta">Plataforma</span>
        <Chips opciones={ajustes?.plataformas ?? []} valor={plataforma} onCambio={setPlataforma} />
      </div>
      <div className="campo">
        <span className="etiqueta">Estado</span>
        <Chips opciones={ESTADOS_FASE_1} valor={estado} onCambio={setEstado} />
      </div>
      <div className="acciones">
        <button
          className="btn primario"
          disabled={!plataforma}
          onClick={async () => {
            await nuevaPartida(juego.id, plataforma!, estado)
            onCerrar()
          }}
        >
          Crear
        </button>
      </div>
    </Hoja>
  )
}

function HojaEditarJuego({ juego, onCerrar }: { juego: Juego; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState(juego.titulo)
  const [portada, setPortada] = useState(juego.portada_url)
  const [deku, setDeku] = useState(juego.enlace_deku ?? '')
  const [error, setError] = useState<string | null>(null)
  return (
    <Hoja titulo="Editar juego" onCerrar={onCerrar}>
      <div className="campo">
        <label className="etiqueta" htmlFor="t">
          Título
        </label>
        <input id="t" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <CampoPortada valor={portada} onCambio={setPortada} />
      <div className="campo">
        <label className="etiqueta" htmlFor="deku">
          Enlace directo de Deku Deals
        </label>
        <input id="deku" type="url" placeholder="https://www.dekudeals.com/items/…" value={deku} onChange={(e) => setDeku(e.target.value)} />
        <span className="ayuda">Abre la búsqueda, entra en la ficha correcta y pega aquí su dirección.</span>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="acciones">
        <button
          className="btn primario"
          onClick={async () => {
            if (!titulo.trim()) return setError('El título no puede quedar vacío')
            if (deku.trim() && !esEnlaceDekuValido(deku)) return setError('El enlace de Deku Deals debe ser de una ficha (…/items/…)')
            await actualizarJuego(juego.id, { titulo: titulo.trim(), portada_url: portada, enlace_deku: deku.trim() || null })
            onCerrar()
          }}
        >
          Guardar
        </button>
      </div>
    </Hoja>
  )
}

export function Ficha({ id }: { id: string }) {
  const datos = useDatos()
  const [editando, setEditando] = useState<Partida | null>(null)
  const [horasDe, setHorasDe] = useState<Partida | null>(null)
  const [abandono, setAbandono] = useState<{ partida: Partida; antes: Partida } | null>(null)
  const [hoja, setHoja] = useState<'nueva' | 'igdb' | 'juego' | null>(null)
  const [descripcionAbierta, setDescripcionAbierta] = useState(false)

  if (!datos) return null
  const juego = datos.porId.get(id)
  if (!juego) {
    return (
      <>
        <Cabecera titulo="Juego" izquierda={<button className="btn-icono" onClick={() => volver()} aria-label="Volver"><Icono nombre="atras" /></button>} />
        <p className="vacio">Este juego ya no existe.</p>
      </>
    )
  }
  const partidas = datos.partidas.filter((p) => p.juego_id === id).sort((a, b) => claveFecha(b).localeCompare(claveFecha(a)))

  return (
    <>
      <Cabecera
        titulo=""
        izquierda={
          <button className="btn-icono" onClick={() => volver()} aria-label="Volver">
            <Icono nombre="atras" />
          </button>
        }
        derecha={
          <button className="btn pequeno fantasma" onClick={() => setHoja('juego')}>
            Editar
          </button>
        }
      />
      <section className="ficha-cabecera">
        <Portada url={juego.portada_url} titulo={juego.titulo} tam="l" />
        <div className="ficha-datos">
          <h1>{juego.titulo}</h1>
          {juego.anio_lanzamiento && <p className="secundario">{juego.anio_lanzamiento}</p>}
          {juego.generos.length > 0 && (
            <div className="etiquetas">
              {juego.generos.map((g) => (
                <span key={g} className="etiqueta-genero">
                  {g}
                </span>
              ))}
            </div>
          )}
          {juego.nota_critica != null && (
            <p className="secundario">
              Crítica: <strong>{formatoDecimal(juego.nota_critica)}</strong> ({juego.fuente_critica})
            </p>
          )}
        </div>
      </section>

      {juego.descripcion && (
        <section className="seccion">
          <p className={`descripcion ${descripcionAbierta ? 'abierta' : ''}`} onClick={() => setDescripcionAbierta(!descripcionAbierta)}>
            {juego.descripcion}
          </p>
        </section>
      )}

      {(juego.igdb_estado === 'propuesto' || juego.igdb_estado === 'sin_resultados' || juego.igdb_estado === 'sin_buscar') && (
        <section className="seccion">
          <Aviso>
            {juego.igdb_estado === 'propuesto'
              ? 'Sin ficha de IGDB confirmada. Elige la correcta:'
              : juego.igdb_estado === 'sin_resultados'
                ? 'IGDB no encontró este título. Búscalo con otro nombre o déjalo sin ficha.'
                : 'Aún no se ha buscado en IGDB.'}
          </Aviso>
          {juego.igdb_propuestas.length > 0 && (
            <ul className="lista">
              {juego.igdb_propuestas.map((r) => (
                <ResultadoIgdb key={r.igdb_id} r={r} onElegir={(r) => vincularIgdb(juego.id, r)} />
              ))}
            </ul>
          )}
          <div className="acciones">
            <button className="btn pequeno fantasma" onClick={() => dejarSinIgdb(juego.id)}>
              Dejar sin ficha
            </button>
            <button className="btn pequeno" onClick={() => setHoja('igdb')}>
              Buscar en IGDB
            </button>
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="seccion-titulo">
          <h2>Partidas</h2>
          <button className="btn pequeno" onClick={() => setHoja('nueva')}>
            Nueva partida
          </button>
        </div>
        {partidas.map((p) => (
          <article key={p.id} className="tarjeta partida">
            <div className="partida-cabecera">
              <EtiquetaEstado estado={p.estado} />
              <span className="secundario">{p.plataforma ?? 'Sin plataforma'}</span>
              {p.nota != null && <span className="nota grande">{formatoNota(p.nota)}</span>}
            </div>
            <dl className="partida-datos">
              {fechasPartida(p) && (
                <>
                  <dt>{p.fecha_inicio || p.fecha_fin ? 'Fechas' : 'Año'}</dt>
                  <dd>{fechasPartida(p)}</dd>
                </>
              )}
              {p.horas != null && (
                <>
                  <dt>Horas</dt>
                  <dd>{formatoDecimal(p.horas)}</dd>
                </>
              )}
              {(p.horas_estimadas_min != null || p.horas_estimadas_max != null) && (
                <>
                  <dt>Estimación</dt>
                  <dd>
                    {p.horas_estimadas_min === p.horas_estimadas_max || p.horas_estimadas_max == null
                      ? `${p.horas_estimadas_min} h`
                      : `${p.horas_estimadas_min ?? '?'} a ${p.horas_estimadas_max} h`}
                  </dd>
                </>
              )}
              {p.completado_100 && (
                <>
                  <dt>100%</dt>
                  <dd>Sí</dd>
                </>
              )}
              {p.motivo_abandono.length > 0 && (
                <>
                  <dt>Motivo</dt>
                  <dd>{p.motivo_abandono.join(', ')}</dd>
                </>
              )}
              {p.retomar && (
                <>
                  <dt>Retomar</dt>
                  <dd>{RETOMAR[p.retomar]}</dd>
                </>
              )}
              {p.nota_original_100 != null && (
                <>
                  <dt>Nota original</dt>
                  <dd>{p.nota_original_100} sobre 100</dd>
                </>
              )}
            </dl>
            {p.resena && <p className="resena">{p.resena}</p>}
            {p.revisar && (
              <Aviso>
                <strong>Por revisar:</strong> {p.revisar}
              </Aviso>
            )}
            <div className="acciones">
              <button
                className="btn pequeno fantasma peligro-texto"
                onClick={async () => {
                  if (confirm(partidas.length === 1 ? 'Es la única partida: se borra también el juego. ¿Continuar?' : '¿Borrar esta partida?')) {
                    await borrarPartida(p)
                    if (partidas.length === 1) volver()
                  }
                }}
              >
                Borrar
              </button>
              {(p.estado === 'Jugando' || p.estado === 'Pausado') && (
                <button className="btn pequeno" onClick={() => setHorasDe(p)}>
                  Horas
                </button>
              )}
              {p.estado !== 'Terminado' && p.estado !== 'Abandonado' && (
                <button
                  className="btn pequeno peligro"
                  onClick={async () => {
                    const antes = await abandonar(p)
                    setAbandono({ partida: { ...p, estado: 'Abandonado' }, antes })
                  }}
                >
                  Abandonar
                </button>
              )}
              <button className="btn pequeno primario" onClick={() => setEditando(p)}>
                Editar
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="seccion">
        <h2>Enlaces</h2>
        <div className="enlaces">
          <a className="btn pequeno" href={enlaceDeku(juego.titulo, juego.enlace_deku)} target="_blank" rel="noopener noreferrer">
            Deku Deals <Icono nombre="enlace" />
          </a>
          {juego.igdb_url && (
            <a className="btn pequeno" href={juego.igdb_url} target="_blank" rel="noopener noreferrer">
              IGDB <Icono nombre="enlace" />
            </a>
          )}
        </div>
        <h3 className="subtitulo">Medios</h3>
        <div className="enlaces">
          {MEDIOS.map((m) => (
            <a key={m.dominio} className="btn pequeno fantasma" href={enlaceMedio(juego.titulo, m.dominio)} target="_blank" rel="noopener noreferrer">
              {m.nombre}
            </a>
          ))}
        </div>
        {juego.igdb_estado === 'confirmado' && (
          <button className="btn pequeno fantasma" onClick={() => setHoja('igdb')}>
            Cambiar ficha de IGDB
          </button>
        )}
      </section>

      {editando && <EditorPartida partida={editando} onCerrar={() => setEditando(null)} />}
      {horasDe && <HojaHoras partida={horasDe} onCerrar={() => setHorasDe(null)} />}
      {abandono && <HojaAbandono partida={abandono.partida} antes={abandono.antes} onCerrar={() => setAbandono(null)} />}
      {hoja === 'nueva' && <HojaNuevaPartida juego={juego} onCerrar={() => setHoja(null)} />}
      {hoja === 'juego' && <HojaEditarJuego juego={juego} onCerrar={() => setHoja(null)} />}
      {hoja === 'igdb' && (
        <Hoja titulo="Buscar en IGDB" onCerrar={() => setHoja(null)}>
          <BuscadorIgdb
            tituloInicial={juego.titulo}
            onElegir={async (r) => {
              await vincularIgdb(juego.id, r)
              setHoja(null)
            }}
          />
        </Hoja>
      )}
    </>
  )
}
