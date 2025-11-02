export type GameMode = 'human-vs-human' | 'human-vs-ai';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'grandmaster';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

export interface GameState {
  fen: string;
  gameMode: GameMode;
  status: GameStatus;
  currentPlayer: 'w' | 'b';
  winner?: 'w' | 'b' | 'draw';
  moveHistory: string[];
  difficulty?: Difficulty;
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}
