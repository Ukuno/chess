export type GameMode = 'human-vs-human' | 'human-vs-ai' | 'puzzle' | 'multiplayer';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'grandmaster';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'puzzle-solved' | 'puzzle-failed';

export interface ChessPuzzle {
  id: number;
  fen: string;
  solution: string; // The correct move in UCI format (e.g., "e2e4")
  hint?: string;
  description: string;
  difficulty: Difficulty;
}


export interface GameState {
  fen: string;
  gameMode: GameMode;
  status: GameStatus;
  currentPlayer: 'w' | 'b';
  winner?: 'w' | 'b' | 'draw';
  moveHistory: string[];
  difficulty?: Difficulty;
  currentPuzzle?: ChessPuzzle;
  puzzleSolved?: boolean;
  multiplayerGameId?: string;
  playerColor?: 'w' | 'b';
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}
