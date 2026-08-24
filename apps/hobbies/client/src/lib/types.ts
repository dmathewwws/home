/** Shapes mirrored from the server's API responses. */

export type HobbyKind = 'learn' | 'craft'

export interface Hobby {
  id: string
  did: string
  name: string
  kind: HobbyKind
  hueIndex: number
  sortOrder: number
  createdAt: string
}

export interface PieceLink {
  label: string
  url: string
}

export interface Piece {
  id: string
  did: string
  hobbyId: string
  name: string
  links: PieceLink[]
  source: 'seed' | 'user' | 'muse'
  createdAt: string
}

export interface SessionEntry {
  id: string
  did: string
  hobbyId: string
  pieceId: string | null
  pieceName: string | null
  date: string
  photoId: string | null
  createdAt: string
}

export interface HeatDatum {
  date: string
  hobbyId: string
  count: number
}

export interface MuseIdea {
  title: string
  why: string
}

export interface BootstrapData {
  hobbies: Hobby[]
  pieces: Piece[]
  heatmap: HeatDatum[]
  journal: SessionEntry[]
}
