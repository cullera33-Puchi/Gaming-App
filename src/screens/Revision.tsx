import { ResultadoIgdb } from '../components/BuscadorIgdb'
import { Aviso, Cabecera, EtiquetaEstado, Icono, Portada } from '../components/comunes'
import { actualizarPartida, dejarSinIgdb, vincularIgdb } from '../lib/acciones'
import { useAjustes } from '../lib/ajustes'
import { calcularRevision } from '../lib/consultas'
import { useDatos } from '../lib/datos'
import { emparejarPendientes, useProgresoEmparejado } from '../lib/emparejar'
import { ir, volver } from '../lib/router'
import { abrirBibliotecaSinPlataforma } from './Biblioteca'

export function ProgresoIgdb() {
  const prog = useProgresoEmparejado()
  if (!prog.activo && !prog.error && prog.total === 0) return null
  return (
    <div className="progreso">
      {prog.activo && (
        <>
          <progress max={prog.total} value={prog.hechos} />
          <span className="secundario">
            {prog.hechos} de {prog.total}: {prog.confirmados} vinculados, {prog.aRevisar} a revisar
          </span>
        </>
      )}
      {!prog.activo && !prog.error && (
        <Aviso tipo="ok">
          Búsqueda terminada: {prog.confirmados} vinculados y {prog.aRevisar} a revisar.
        </Aviso>
      )}
      {prog.error && <Aviso tipo="error">Búsqueda interrumpida: {prog.error}</Aviso>}
    </div>
  )
}

export function Revision() {
  const datos = useDatos()
  const ajustes = useAjustes()
  const prog = useProgresoEmparejado()
  if (!datos || !ajustes) return null
  const r = calcularRevision(datos.juegos, datos.partidas)

  return (
    <>
      <Cabecera
        titulo="Revisión de la carga"
        izquierda={
          <button className="btn-icono" onClick={() => volver('inicio')} aria-label="Volver">
            <Icono nombre="atras" />
          </button>
        }
      />

      <section className="seccion">
        <h2>1. Buscar en IGDB</h2>
        {r.sinBuscar.length === 0 && !prog.activo ? (
          <p className="secundario">Todos los juegos se han buscado ya en IGDB.</p>
        ) : (
          <>
            <p className="secundario">{r.sinBuscar.length} juegos sin buscar. Las portadas se descargan en segundo plano.</p>
            {!ajustes.intermediario_url && <Aviso>Configura antes el intermediario en Ajustes.</Aviso>}
            <button className="btn primario" disabled={prog.activo || !ajustes.intermediario_url} onClick={() => emparejarPendientes()}>
              {prog.activo ? 'Buscando…' : 'Buscar todos en IGDB'}
            </button>
          </>
        )}
        <ProgresoIgdb />
      </section>

      <section className="seccion">
        <h2>2. Sin coincidencia clara ({r.sinFichaClara.length})</h2>
        {r.sinFichaClara.length === 0 && <p className="secundario">Nada pendiente.</p>}
        {r.sinFichaClara.map((j) => (
          <article key={j.id} className="tarjeta">
            <div className="revision-cabecera">
              <button className="enlace-texto" onClick={() => ir(`juego/${j.id}`)}>
                {j.titulo}
              </button>
              <button className="btn pequeno fantasma" onClick={() => dejarSinIgdb(j.id)}>
                Sin ficha
              </button>
            </div>
            {j.igdb_propuestas.length ? (
              <ul className="lista compacta">
                {j.igdb_propuestas.slice(0, 3).map((c) => (
                  <ResultadoIgdb key={c.igdb_id} r={c} onElegir={(c) => vincularIgdb(j.id, c)} />
                ))}
              </ul>
            ) : (
              <p className="secundario">IGDB no devolvió resultados. Abre la ficha para buscar con otro nombre.</p>
            )}
          </article>
        ))}
      </section>

      <section className="seccion">
        <h2>3. Por confirmar ({r.porConfirmar.length})</h2>
        {r.porConfirmar.length === 0 && <p className="secundario">Nada pendiente.</p>}
        <ul className="lista">
          {r.porConfirmar.map((p) => {
            const j = datos.porId.get(p.juego_id)
            if (!j) return null
            return (
              <li key={p.id} className="fila-revision">
                <button className="fila" onClick={() => ir(`juego/${j.id}`)}>
                  <Portada url={j.portada_url} titulo={j.titulo} />
                  <span className="fila-texto">
                    <span className="fila-titulo">{j.titulo}</span>
                    <span className="secundario">{p.revisar}</span>
                  </span>
                  <EtiquetaEstado estado={p.estado} />
                </button>
                <button className="btn pequeno fantasma" onClick={() => actualizarPartida(p.id, { revisar: null })}>
                  Revisado
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="seccion">
        <h2>4. Sin plataforma ({r.sinPlataforma.length})</h2>
        {r.sinPlataforma.length === 0 ? (
          <p className="secundario">Todas las partidas tienen plataforma.</p>
        ) : (
          <>
            <p className="secundario">Selecciona varias en la biblioteca y asígnales plataforma de una vez.</p>
            <button className="btn primario" onClick={abrirBibliotecaSinPlataforma}>
              Completar plataformas
            </button>
          </>
        )}
      </section>
    </>
  )
}
