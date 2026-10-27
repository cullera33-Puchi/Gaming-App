import { describe, expect, it } from 'vitest'
import backlog from '../../data/backlog_juegos.json'
import historico from '../../data/historico_juegos_2021_2026.json'
import { aplicarCambioEstado } from './acciones'
import { anioPartida, calcularRevision, resumenAnio } from './consultas'
import { enlaceDeku, enlaceMedio, esEnlaceDekuValido } from './enlaces'
import { decidirCoincidencia } from './igdb'
import { importarDatosIniciales, partidaVacia, type FicheroBacklog, type FicheroHistorico } from './importar'
import { esNotaValida, formatoNota, notaDesde100, redondearNota } from './nota'
import { normalizarTitulo, similitud } from './texto'
import type { IgdbJuego } from './types'

const carga = () => importarDatosIniciales(historico as unknown as FicheroHistorico, backlog as unknown as FicheroBacklog)

describe('nota', () => {
  it('redondea al 0,25 más cercano dentro de 1 a 10', () => {
    expect(notaDesde100(72)).toBe(7.25)
    expect(notaDesde100(91)).toBe(9)
    expect(notaDesde100(78)).toBe(7.75)
    expect(redondearNota(0.2)).toBe(1)
    expect(redondearNota(10.4)).toBe(10)
  })

  it('formatea en español', () => {
    expect(formatoNota(7.25)).toBe('7,25')
    expect(formatoNota(9)).toBe('9')
    expect(formatoNota(null)).toBe('Sin nota')
  })

  it('las notas del histórico respetan la escala', () => {
    for (const p of (historico as unknown as FicheroHistorico).partidas) {
      if (p.nota != null) expect(esNotaValida(p.nota), p.titulo).toBe(true)
    }
  })
})

describe('carga inicial', () => {
  it('cuadra con el diseño funcional', () => {
    const r = carga()
    const hist = r.partidas.filter((p) => p.origen === 'historico')
    const back = r.partidas.filter((p) => p.origen === 'backlog')
    expect(hist).toHaveLength(106)
    expect(hist.filter((p) => p.estado === 'Terminado')).toHaveLength(90)
    expect(hist.filter((p) => p.estado === 'Abandonado')).toHaveLength(15)
    expect(hist.filter((p) => p.estado === 'Pausado')).toHaveLength(1)
    expect(back).toHaveLength(100)
    expect(back.filter((p) => p.estado === 'Pendiente')).toHaveLength(99)
    expect(back.filter((p) => p.plataforma)).toHaveLength(46)
    expect(back.filter((p) => p.revisar)).toHaveLength(16)
  })

  it('crea un juego por título y una partida por aparición', () => {
    const r = carga()
    expect(r.partidas).toHaveLength(206)
    // FFVII Remake repetido en el histórico y cuatro juegos que están en histórico y backlog.
    expect(r.juegos).toHaveLength(201)
    const ff7r = r.juegos.find((j) => j.titulo === 'Final Fantasy VII Remake')!
    const partidas = r.partidas.filter((p) => p.juego_id === ff7r.id)
    expect(partidas.map((p) => `${p.anio} ${p.estado}`).sort()).toEqual(['2023 Terminado', '2026 Abandonado'])
  })

  it('suma de horas estimadas del backlog', () => {
    const back = carga().partidas.filter((p) => p.origen === 'backlog')
    const min = back.reduce((s, p) => s + (p.horas_estimadas_min ?? 0), 0)
    const max = back.reduce((s, p) => s + (p.horas_estimadas_max ?? 0), 0)
    expect([min, max]).toEqual([1040, 1181])
  })

  it('tasa de abandono por año como en el diseño', () => {
    const { partidas } = carga()
    const h = partidas.filter((p) => p.origen === 'historico')
    expect(resumenAnio(h, 2024)).toMatchObject({ terminados: 18, abandonados: 2 })
    expect(resumenAnio(h, 2025)).toMatchObject({ terminados: 26, abandonados: 8 })
    expect(resumenAnio(h, 2026)).toMatchObject({ terminados: 10, abandonados: 5 })
  })

  it('la lista de revisión incluye pendiente_confirmar, revisar y sin plataforma', () => {
    const r = carga()
    const rev = calcularRevision(r.juegos, r.partidas)
    expect(rev.porConfirmar).toHaveLength(18)
    expect(rev.sinPlataforma).toHaveLength(206 - 46)
    expect(rev.sinBuscar).toHaveLength(201)
  })

  it('Persona 5 Royal y Baldur’s Gate 3 quedan pausados con sus horas', () => {
    const r = carga()
    const horas = (t: string) => {
      const j = r.juegos.find((x) => x.titulo === t)!
      return r.partidas.find((p) => p.juego_id === j.id)
    }
    expect(horas('Persona 5 Royal')).toMatchObject({ estado: 'Pausado', horas: 60 })
    expect(horas("Baldur's Gate 3")).toMatchObject({ estado: 'Pausado', horas: 25 })
  })
})

describe('reglas de estado', () => {
  const base = partidaVacia('j', 'Pendiente', '2026-01-01T00:00:00Z')

  it('al terminar pone fecha de fin y al reabrir la quita', () => {
    const t = aplicarCambioEstado(base, 'Terminado')
    expect(t.fecha_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const j = aplicarCambioEstado({ ...t, completado_100: true }, 'Jugando')
    expect(j.fecha_fin).toBeNull()
    expect(j.completado_100).toBeNull()
    expect(j.fecha_inicio).not.toBeNull()
  })

  it('en el histórico basta el año', () => {
    const t = aplicarCambioEstado({ ...base, anio: 2023 }, 'Terminado')
    expect(t.fecha_fin).toBeNull()
    expect(anioPartida(t)).toBe(2023)
  })

  it('el motivo de abandono solo vive en Abandonado', () => {
    const a = { ...aplicarCambioEstado(base, 'Abandonado'), motivo_abandono: ['Lento'], retomar: 'quiza' as const }
    const p = aplicarCambioEstado(a, 'Pausado')
    expect(p.motivo_abandono).toEqual([])
    expect(p.retomar).toBeNull()
  })
})

describe('emparejado con IGDB', () => {
  const r = (titulo: string, anio: number | null, popularidad = 50, igdb_id = Math.random()): IgdbJuego => ({
    igdb_id,
    titulo,
    anio,
    portada_url: null,
    descripcion: null,
    generos: [],
    plataformas: [],
    nota_critica: null,
    num_criticas: null,
    popularidad,
    url: null,
  })

  it('normaliza y compara títulos', () => {
    expect(normalizarTitulo("Marvel's Spider-Man")).toBe('marvels spider man')
    expect(normalizarTitulo('God of War Ragnarök')).toBe('god of war ragnarok')
    expect(similitud('Ghost of Tsushima', 'Ghost of Tsushima')).toBe(1)
    expect(similitud('Hades', 'Hades II')).toBeGreaterThan(0.5)
  })

  it('confirma una coincidencia exacta única', () => {
    const d = decidirCoincidencia('Hi-Fi Rush', [r('Hi-Fi Rush', 2023), r('Rush', 1999)])
    expect(d.elegido?.titulo).toBe('Hi-Fi Rush')
  })

  it('usa el año del título para desempatar', () => {
    const d = decidirCoincidencia('God of War (2018)', [r('God of War', 2005, 900), r('God of War', 2018, 2000)])
    expect(d.elegido?.anio).toBe(2018)
    const sinAnio = decidirCoincidencia('Silent Hill 2 (2024)', [r('Silent Hill 2', 2001)])
    expect(sinAnio.elegido).toBeNull()
  })

  it('deja a revisión los empates sin popularidad clara y los parecidos', () => {
    expect(decidirCoincidencia('Hades', [r('Hades', 2020, 100), r('Hades', 2011, 60)]).elegido).toBeNull()
    expect(decidirCoincidencia('Hades', [r('Hades', 2020, 900), r('Hades', 2011, 3)]).elegido?.anio).toBe(2020)
    const d = decidirCoincidencia('Xenoblade 2', [r('Xenoblade Chronicles 2', 2017)])
    expect(d.elegido).toBeNull()
    expect(d.candidatos).toHaveLength(1)
  })
})

describe('enlaces', () => {
  it('busca en cada medio limitado a su dominio', () => {
    expect(enlaceMedio('Elden Ring', 'vandal.elespanol.com')).toBe(
      'https://www.google.com/search?q=%22Elden%20Ring%22%20site%3Avandal.elespanol.com',
    )
  })

  it('Deku Deals usa el enlace guardado si existe', () => {
    expect(enlaceDeku('Okami HD', null)).toContain('/search?q=Okami%20HD')
    expect(enlaceDeku('Okami HD', 'https://www.dekudeals.com/items/okami-hd')).toBe('https://www.dekudeals.com/items/okami-hd')
    expect(esEnlaceDekuValido('https://www.dekudeals.com/items/okami-hd?country=es')).toBe(true)
    expect(esEnlaceDekuValido('https://www.dekudeals.com/search?q=okami')).toBe(false)
  })
})
