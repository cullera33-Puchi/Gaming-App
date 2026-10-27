// Traducción de los géneros de IGDB, que llegan en inglés.
const GENEROS: Record<string, string> = {
  'Point-and-click': 'Aventura gráfica',
  Fighting: 'Lucha',
  Shooter: 'Disparos',
  Music: 'Música',
  Platform: 'Plataformas',
  Puzzle: 'Puzle',
  Racing: 'Conducción',
  'Real Time Strategy (RTS)': 'Estrategia en tiempo real',
  'Role-playing (RPG)': 'Rol',
  Simulator: 'Simulación',
  Sport: 'Deportes',
  Strategy: 'Estrategia',
  'Turn-based strategy (TBS)': 'Estrategia por turnos',
  Tactical: 'Táctico',
  "Hack and slash/Beat 'em up": 'Hack and slash',
  'Quiz/Trivia': 'Preguntas',
  Pinball: 'Pinball',
  Adventure: 'Aventura',
  Indie: 'Indie',
  Arcade: 'Arcade',
  'Visual Novel': 'Novela visual',
  'Card & Board Game': 'Cartas y tablero',
  MOBA: 'MOBA',
}

export function traducirGenero(genero: string): string {
  return GENEROS[genero] ?? genero
}
