import { Cabecera, Icono } from './components/comunes'
import { ir, useRuta, type Ruta } from './lib/router'
import { Ajustes } from './screens/Ajustes'
import { Alta } from './screens/Alta'
import { Biblioteca } from './screens/Biblioteca'
import { Ficha } from './screens/Ficha'
import { Inicio } from './screens/Inicio'
import { Revision } from './screens/Revision'

const PESTANAS = [
  { ruta: 'inicio', nombre: 'Inicio', icono: 'inicio' },
  { ruta: 'biblioteca', nombre: 'Biblioteca', icono: 'biblioteca' },
  { ruta: 'deseados', nombre: 'Deseados', icono: 'deseados' },
  { ruta: 'analisis', nombre: 'Análisis', icono: 'analisis' },
  { ruta: 'ajustes', nombre: 'Ajustes', icono: 'ajustes' },
] as const

function Proximamente({ titulo, fase, texto }: { titulo: string; fase: number; texto: string }) {
  return (
    <>
      <Cabecera titulo={titulo} />
      <section className="vacio">
        <h2>Llega en la fase {fase}</h2>
        <p>{texto}</p>
      </section>
    </>
  )
}

function Pantalla({ ruta }: { ruta: Ruta }) {
  switch (ruta.pantalla) {
    case 'inicio':
      return <Inicio />
    case 'biblioteca':
      return <Biblioteca />
    case 'juego':
      return <Ficha key={ruta.id} id={ruta.id} />
    case 'alta':
      return <Alta />
    case 'revision':
      return <Revision />
    case 'ajustes':
      return <Ajustes />
    case 'deseados':
      return <Proximamente titulo="Deseados" fase={3} texto="Lista de deseados con precio actual de Steam y eShop, mínimo histórico y precio objetivo." />
    case 'analisis':
      return <Proximamente titulo="Análisis" fase={2} texto="Tasa de abandono, motivos, nota media por año, género y plataforma, y recomendaciones con Claude." />
  }
}

export function App() {
  const ruta = useRuta()
  const activa = ruta.pantalla === 'juego' || ruta.pantalla === 'revision' ? 'biblioteca' : ruta.pantalla
  return (
    <div className="app">
      <main className="contenido">
        <Pantalla ruta={ruta} />
      </main>
      {ruta.pantalla !== 'alta' && (
        <button className="fab" onClick={() => ir('alta')} aria-label="Añadir juego">
          <Icono nombre="mas" />
        </button>
      )}
      <nav className="tabbar" aria-label="Secciones">
        {PESTANAS.map((p) => (
          <a key={p.ruta} href={`#/${p.ruta}`} className={activa === p.ruta ? 'activa' : ''} aria-current={activa === p.ruta ? 'page' : undefined}>
            <Icono nombre={p.icono} />
            <span>{p.nombre}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
