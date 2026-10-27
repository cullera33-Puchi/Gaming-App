import { useEffect, useState } from 'react'
import { Aviso, Cabecera } from '../components/comunes'
import { cargarDatosIniciales, renombrarPlataforma } from '../lib/acciones'
import { guardarAjuste, useAjustes } from '../lib/ajustes'
import { useDatos } from '../lib/datos'
import { borrarTodo, exportarJson, restaurarCopia, validarExportacion } from '../lib/exportar'
import { probarIntermediario } from '../lib/igdb'
import { ir } from '../lib/router'

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null

export function Ajustes() {
  const ajustes = useAjustes()
  const datos = useDatos()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [nuevaPlataforma, setNuevaPlataforma] = useState('')
  const [horas, setHoras] = useState('')
  const [msg, setMsg] = useState<Mensaje>(null)
  const [msgDatos, setMsgDatos] = useState<Mensaje>(null)

  useEffect(() => {
    if (!ajustes) return
    setUrl(ajustes.intermediario_url)
    setToken(ajustes.intermediario_token)
    setHoras(ajustes.horas_semanales != null ? String(ajustes.horas_semanales) : '')
  }, [ajustes?.intermediario_url, ajustes?.intermediario_token, ajustes?.horas_semanales])

  if (!ajustes || !datos) return null
  const usos = (p: string) => datos.partidas.filter((x) => x.plataforma === p).length

  const ejecutar = async (f: () => Promise<string>, set: (m: Mensaje) => void) => {
    try {
      set({ tipo: 'ok', texto: await f() })
    } catch (e) {
      set({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <>
      <Cabecera titulo="Ajustes" grande />

      <section className="seccion">
        <h2>Plataformas</h2>
        <ul className="lista-simple">
          {ajustes.plataformas.map((p, i) => (
            <li key={p}>
              <span>
                {p} <span className="secundario">({usos(p)})</span>
              </span>
              <span className="acciones-fila">
                <button
                  className="btn-icono"
                  aria-label={`Subir ${p}`}
                  disabled={i === 0}
                  onClick={() => {
                    const l = [...ajustes.plataformas]
                    ;[l[i - 1], l[i]] = [l[i], l[i - 1]]
                    guardarAjuste('plataformas', l)
                  }}
                >
                  ↑
                </button>
                <button
                  className="btn pequeno fantasma"
                  onClick={() => {
                    const nombre = prompt('Nuevo nombre', p)?.trim()
                    if (nombre && nombre !== p && !ajustes.plataformas.includes(nombre)) renombrarPlataforma(p, nombre)
                  }}
                >
                  Renombrar
                </button>
                <button
                  className="btn pequeno fantasma peligro-texto"
                  disabled={usos(p) > 0}
                  title={usos(p) > 0 ? 'Tiene partidas asignadas' : undefined}
                  onClick={() => guardarAjuste('plataformas', ajustes.plataformas.filter((x) => x !== p))}
                >
                  Quitar
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form
          className="fila-form"
          onSubmit={(e) => {
            e.preventDefault()
            const n = nuevaPlataforma.trim()
            if (n && !ajustes.plataformas.includes(n)) guardarAjuste('plataformas', [...ajustes.plataformas, n])
            setNuevaPlataforma('')
          }}
        >
          <input placeholder="Nueva plataforma" value={nuevaPlataforma} onChange={(e) => setNuevaPlataforma(e.target.value)} />
          <button className="btn pequeno">Añadir</button>
        </form>
      </section>

      <section className="seccion">
        <h2>Horas semanales de juego</h2>
        <form
          className="fila-form"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(horas.replace(',', '.'))
            guardarAjuste('horas_semanales', horas.trim() && Number.isFinite(n) && n > 0 ? n : null)
          }}
        >
          <input inputMode="decimal" placeholder="Por ejemplo, 8" value={horas} onChange={(e) => setHoras(e.target.value)} />
          <button className="btn pequeno">Guardar</button>
        </form>
        <p className="ayuda">Se usará para calcular el siguiente juego (fase 4).</p>
      </section>

      <section className="seccion">
        <h2>Intermediario (IGDB)</h2>
        <p className="ayuda">Dirección del Cloudflare Worker y token de la app. Se guardan solo en este dispositivo.</p>
        <div className="campo">
          <label className="etiqueta" htmlFor="url">
            Dirección
          </label>
          <input id="url" type="url" placeholder="https://backlog-juegos.<cuenta>.workers.dev" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="token">
            Token
          </label>
          <input id="token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div className="acciones">
          <button
            className="btn"
            onClick={() =>
              ejecutar(async () => {
                await guardarAjuste('intermediario_url', url.trim())
                await guardarAjuste('intermediario_token', token.trim())
                return (await probarIntermediario()) ? 'Conexión correcta' : 'El intermediario no responde bien'
              }, setMsg)
            }
          >
            Guardar y probar
          </button>
        </div>
        {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      </section>

      <section className="seccion">
        <h2>Datos</h2>
        <p className="secundario">
          {datos.juegos.length} juegos y {datos.partidas.length} partidas en este dispositivo.
        </p>
        <div className="acciones columna">
          {!ajustes.carga_inicial && (
            <button className="btn primario" onClick={() => ejecutar(async () => {
              const r = await cargarDatosIniciales()
              return `Cargados ${r.juegos} juegos y ${r.partidas} partidas`
            }, setMsgDatos)}>
              Cargar histórico y backlog
            </button>
          )}
          <button className="btn" onClick={() => ir('revision')}>
            Revisión de la carga
          </button>
          <button className="btn" onClick={() => ejecutar(async () => (await exportarJson(), 'Copia exportada'), setMsgDatos)}>
            Exportar JSON
          </button>
          <label className="btn">
            Importar copia JSON
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                ejecutar(async () => {
                  const copia = validarExportacion(JSON.parse(await f.text()))
                  if (!confirm(`Se sustituyen los datos actuales por la copia del ${copia.exportado.slice(0, 10)} (${copia.juegos.length} juegos). ¿Continuar?`)) {
                    return 'Importación cancelada'
                  }
                  await restaurarCopia(copia)
                  return 'Copia importada'
                }, setMsgDatos)
              }}
            />
          </label>
          <button
            className="btn peligro"
            onClick={() =>
              ejecutar(async () => {
                if (!confirm('Se borran todos los juegos, partidas y ajustes de este dispositivo. Exporta antes una copia. ¿Continuar?')) return 'Borrado cancelado'
                await borrarTodo()
                return 'Datos borrados'
              }, setMsgDatos)
            }
          >
            Borrar todos los datos
          </button>
        </div>
        {msgDatos && <Aviso tipo={msgDatos.tipo}>{msgDatos.texto}</Aviso>}
      </section>

      <section className="seccion">
        <h2>Sincronización</h2>
        <p className="secundario">Google Drive llega en la fase 2. Hasta entonces, exporta una copia JSON de vez en cuando.</p>
      </section>
    </>
  )
}
