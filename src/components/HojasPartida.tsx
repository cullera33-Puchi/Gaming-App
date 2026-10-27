import { useState } from 'react'
import { actualizarHoras, actualizarPartida, aplicarCambioEstado, deshacer } from '../lib/acciones'
import { useAjustes } from '../lib/ajustes'
import { ahoraIso } from '../lib/texto'
import { ESTADOS_FASE_1, MOTIVOS_ABANDONO, type Estado, type Partida, type Retomar } from '../lib/types'
import { Aviso, Chips, ChipsMultiples, Hoja } from './comunes'
import { SelectorNota } from './SelectorNota'

const RETOMAR: Retomar[] = ['si', 'no', 'quiza']
const ETIQUETA_RETOMAR: Record<Retomar, string> = { si: 'Sí', no: 'No', quiza: 'Quizá' }

function numero(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Tras abandonar en un toque: motivo, nota y si retomarlo, todo opcional. */
export function HojaAbandono({ partida, antes, onCerrar }: { partida: Partida; antes: Partida; onCerrar: () => void }) {
  const [motivos, setMotivos] = useState<string[]>(partida.motivo_abandono)
  const [nota, setNota] = useState<number | null>(partida.nota)
  const [retomar, setRetomar] = useState<Retomar | null>(partida.retomar)

  const guardar = async () => {
    await actualizarPartida(partida.id, { motivo_abandono: motivos, nota, retomar })
    onCerrar()
  }

  return (
    <Hoja titulo="Abandonado" onCerrar={onCerrar}>
      <Aviso tipo="ok">
        Guardado con fecha de hoy{partida.horas != null ? ` y ${partida.horas} h` : ''}. Lo que sigue es opcional.
      </Aviso>
      <div className="campo">
        <span className="etiqueta">Motivo</span>
        <ChipsMultiples opciones={MOTIVOS_ABANDONO} valor={motivos} onCambio={setMotivos} />
      </div>
      <div className="campo">
        <span className="etiqueta">Nota</span>
        <SelectorNota valor={nota} onCambio={setNota} />
      </div>
      <div className="campo">
        <span className="etiqueta">¿Retomarlo?</span>
        <Chips opciones={RETOMAR} valor={retomar} onCambio={setRetomar} etiqueta={(r) => ETIQUETA_RETOMAR[r]} />
      </div>
      <div className="acciones">
        <button
          className="btn fantasma"
          onClick={async () => {
            await deshacer(antes)
            onCerrar()
          }}
        >
          Deshacer
        </button>
        <button className="btn primario" onClick={guardar}>
          Guardar
        </button>
      </div>
    </Hoja>
  )
}

export function HojaHoras({ partida, onCerrar }: { partida: Partida; onCerrar: () => void }) {
  const [valor, setValor] = useState(partida.horas != null ? String(partida.horas) : '')
  const sumar = (h: number) => setValor(String((numero(valor) ?? 0) + h))
  return (
    <Hoja titulo="Horas jugadas" onCerrar={onCerrar}>
      <div className="campo">
        <label className="etiqueta" htmlFor="horas">
          Total de horas
        </label>
        <input id="horas" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
      </div>
      <div className="chips">
        {[0.5, 1, 2, 5].map((h) => (
          <button key={h} type="button" className="chip" onClick={() => sumar(h)}>
            +{String(h).replace('.', ',')} h
          </button>
        ))}
      </div>
      <div className="acciones">
        <button
          className="btn primario"
          onClick={async () => {
            await actualizarHoras(partida, numero(valor))
            onCerrar()
          }}
        >
          Guardar
        </button>
      </div>
    </Hoja>
  )
}

/** Edición completa de una partida, con las reglas de cada estado. */
export function EditorPartida({ partida, onCerrar }: { partida: Partida; onCerrar: () => void }) {
  const ajustes = useAjustes()
  const [p, setP] = useState<Partida>(partida)
  const [horas, setHoras] = useState(partida.horas != null ? String(partida.horas) : '')
  const [estMin, setEstMin] = useState(partida.horas_estimadas_min != null ? String(partida.horas_estimadas_min) : '')
  const [estMax, setEstMax] = useState(partida.horas_estimadas_max != null ? String(partida.horas_estimadas_max) : '')
  const [error, setError] = useState<string | null>(null)

  const plataformas = [...new Set([...(ajustes?.plataformas ?? []), ...(p.plataforma ? [p.plataforma] : [])])]
  const cambiar = (c: Partial<Partida>) => setP((x) => ({ ...x, ...c }))
  const estadoActual: Estado = p.estado

  const guardar = async () => {
    if (!p.plataforma) return setError('La plataforma es obligatoria')
    if ((p.estado === 'Terminado' || p.estado === 'Abandonado') && !p.fecha_fin && p.anio == null) {
      return setError('Indica la fecha de fin o el año')
    }
    if (p.fecha_inicio && p.fecha_fin && p.fecha_fin < p.fecha_inicio) {
      return setError('La fecha de fin es anterior a la de inicio')
    }
    const min = numero(estMin)
    const max = numero(estMax)
    if (min != null && max != null && max < min) return setError('La estimación máxima es menor que la mínima')
    const horasNuevas = numero(horas)
    const final: Partida = {
      ...p,
      horas: horasNuevas,
      horas_estimadas_min: min,
      horas_estimadas_max: max,
      resena: p.resena?.trim() || null,
      ultima_sesion: horasNuevas !== partida.horas ? new Date().toISOString().slice(0, 10) : p.ultima_sesion,
      actualizado: ahoraIso(),
    }
    await actualizarPartida(p.id, final)
    onCerrar()
  }

  return (
    <Hoja titulo="Editar partida" onCerrar={onCerrar}>
      <div className="campo">
        <span className="etiqueta">Plataforma</span>
        <Chips opciones={plataformas} valor={p.plataforma} onCambio={(v) => cambiar({ plataforma: v })} />
      </div>
      <div className="campo">
        <span className="etiqueta">Estado</span>
        <Chips opciones={ESTADOS_FASE_1} valor={estadoActual} onCambio={(e) => setP((x) => aplicarCambioEstado(x, e))} />
      </div>
      <div className="fila-campos">
        <div className="campo">
          <label className="etiqueta" htmlFor="ini">
            Inicio
          </label>
          <input id="ini" type="date" value={p.fecha_inicio ?? ''} onChange={(e) => cambiar({ fecha_inicio: e.target.value || null })} />
        </div>
        {(p.estado === 'Terminado' || p.estado === 'Abandonado') && (
          <div className="campo">
            <label className="etiqueta" htmlFor="fin">
              Fin
            </label>
            <input id="fin" type="date" value={p.fecha_fin ?? ''} onChange={(e) => cambiar({ fecha_fin: e.target.value || null })} />
          </div>
        )}
      </div>
      {p.anio != null && (
        <div className="campo">
          <label className="etiqueta" htmlFor="anio">
            Año (histórico)
          </label>
          <input id="anio" inputMode="numeric" value={p.anio} onChange={(e) => cambiar({ anio: numero(e.target.value) })} />
        </div>
      )}
      <div className="fila-campos">
        <div className="campo">
          <label className="etiqueta" htmlFor="h">
            Horas jugadas
          </label>
          <input id="h" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="emin">
            Estimación mín.
          </label>
          <input id="emin" inputMode="decimal" value={estMin} onChange={(e) => setEstMin(e.target.value)} />
        </div>
        <div className="campo">
          <label className="etiqueta" htmlFor="emax">
            Estimación máx.
          </label>
          <input id="emax" inputMode="decimal" value={estMax} onChange={(e) => setEstMax(e.target.value)} />
        </div>
      </div>
      <div className="campo">
        <span className="etiqueta">Nota</span>
        <SelectorNota valor={p.nota} onCambio={(nota) => cambiar({ nota })} />
      </div>
      {p.estado === 'Terminado' && (
        <label className="check">
          <input type="checkbox" checked={p.completado_100 === true} onChange={(e) => cambiar({ completado_100: e.target.checked })} />
          Completado al 100%
        </label>
      )}
      {p.estado === 'Abandonado' && (
        <>
          <div className="campo">
            <span className="etiqueta">Motivo de abandono</span>
            <ChipsMultiples opciones={MOTIVOS_ABANDONO} valor={p.motivo_abandono} onCambio={(motivo_abandono) => cambiar({ motivo_abandono })} />
          </div>
          <div className="campo">
            <span className="etiqueta">¿Retomarlo?</span>
            <Chips opciones={RETOMAR} valor={p.retomar} onCambio={(retomar) => cambiar({ retomar })} etiqueta={(r) => ETIQUETA_RETOMAR[r]} />
          </div>
        </>
      )}
      <div className="campo">
        <label className="etiqueta" htmlFor="resena">
          Reseña corta
        </label>
        <textarea id="resena" rows={3} maxLength={500} value={p.resena ?? ''} onChange={(e) => cambiar({ resena: e.target.value })} />
      </div>
      {p.revisar && (
        <Aviso>
          <strong>Por revisar:</strong> {p.revisar}
          <button type="button" className="btn fantasma pequeno" onClick={() => cambiar({ revisar: null })}>
            Marcar como revisado
          </button>
        </Aviso>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="acciones">
        <button className="btn fantasma" onClick={onCerrar}>
          Cancelar
        </button>
        <button className="btn primario" onClick={guardar}>
          Guardar
        </button>
      </div>
    </Hoja>
  )
}
