import { useState } from 'react'
import { BuscadorIgdb } from '../components/BuscadorIgdb'
import { Aviso, BotonAtras, Cabecera, Chips, Portada } from '../components/comunes'
import { darDeAlta } from '../lib/acciones'
import { useAjustes } from '../lib/ajustes'
import { imagenAPortada } from '../lib/imagen'
import { ir, volver } from '../lib/router'
import { ESTADOS_FASE_1, type Estado, type IgdbJuego } from '../lib/types'

export function CampoPortada({ valor, onCambio }: { valor: string | null; onCambio: (v: string | null) => void }) {
  const [url, setUrl] = useState(valor?.startsWith('http') ? valor : '')
  return (
    <div className="campo">
      <span className="etiqueta">Portada (opcional)</span>
      <div className="fila-portada">
        <Portada url={valor} titulo="?" tam="m" />
        <div className="fila-portada-controles">
          <input
            type="url"
            placeholder="Dirección de la imagen"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              onCambio(e.target.value.trim() || null)
            }}
          />
          <label className="btn pequeno gris">
            Elegir foto
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setUrl('')
                  onCambio(await imagenAPortada(f))
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export function Alta() {
  const ajustes = useAjustes()
  const [modo, setModo] = useState<'buscar' | 'manual'>('buscar')
  const [elegido, setElegido] = useState<IgdbJuego | null>(null)
  const [titulo, setTitulo] = useState('')
  const [portada, setPortada] = useState<string | null>(null)
  const [plataforma, setPlataforma] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('Pendiente')
  const [sinIntermediario, setSinIntermediario] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ajustes) return null
  const listo = modo === 'manual' || elegido

  const guardar = async () => {
    const t = elegido?.titulo ?? titulo.trim()
    if (!t) return setError('Falta el título')
    if (!plataforma) return setError('Elige la plataforma')
    const id = await darDeAlta({ igdb: elegido, titulo: t, portada_url: portada, plataforma, estado })
    ir(`juego/${id}`)
  }

  return (
    <>
      <Cabecera
        titulo="Añadir juego"
        izquierda={<BotonAtras onClick={() => volver('inicio')} />}
      />
      {!listo && (
        <section className="seccion">
          {sinIntermediario && (
            <Aviso>
              La búsqueda en IGDB necesita el intermediario configurado en Ajustes. Mientras tanto puedes darlo de alta a mano.
            </Aviso>
          )}
          <BuscadorIgdb
            onElegir={(r) => {
              setElegido(r)
              setTitulo(r.titulo)
            }}
            onSinIntermediario={() => setSinIntermediario(true)}
          />
          <button className="btn fantasma ancho" onClick={() => setModo('manual')}>
            No lo encuentro: alta manual
          </button>
        </section>
      )}

      {listo && (
        <section className="seccion formulario">
          {elegido ? (
            <div className="elegido">
              <Portada url={elegido.portada_url} titulo={elegido.titulo} tam="m" />
              <div>
                <h2>{elegido.titulo}</h2>
                <p className="secundario">{[elegido.anio, elegido.generos.join(', ')].filter(Boolean).join(', ')}</p>
                <button className="btn pequeno fantasma" onClick={() => setElegido(null)}>
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="campo">
                <label className="etiqueta" htmlFor="titulo">
                  Título
                </label>
                <input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
              </div>
              <CampoPortada valor={portada} onCambio={setPortada} />
              <button className="btn pequeno fantasma" onClick={() => setModo('buscar')}>
                Volver a buscar en IGDB
              </button>
            </>
          )}
          <div className="campo">
            <span className="etiqueta">Plataforma</span>
            <Chips opciones={ajustes.plataformas} valor={plataforma} onCambio={setPlataforma} />
          </div>
          <div className="campo">
            <span className="etiqueta">Estado inicial</span>
            <Chips opciones={ESTADOS_FASE_1} valor={estado} onCambio={setEstado} />
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <button className="btn primario ancho" onClick={guardar}>
            Guardar
          </button>
        </section>
      )}
    </>
  )
}
