import { Chess } from 'chess.js';
import { ChessMove, Difficulty } from '@/types/chess';

// Simple AI that makes random legal moves
export const getRandomMove = (game: Chess): ChessMove | null => {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  return {
    from: randomMove.from,
    to: randomMove.to,
    promotion: randomMove.promotion,
  };
};

// Slightly smarter AI that prioritizes captures and checks
export const getSmartMove = (game: Chess): ChessMove | null => {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Prioritize moves that capture pieces
  const captureMoves = moves.filter(move => move.captured);
  if (captureMoves.length > 0) {
    const randomCapture = captureMoves[Math.floor(Math.random() * captureMoves.length)];
    return {
      from: randomCapture.from,
      to: randomCapture.to,
      promotion: randomCapture.promotion,
    };
  }

  // Prioritize moves that give check
  const checkMoves = moves.filter(move => {
    const testGame = new Chess(game.fen());
    testGame.move(move);
    return testGame.inCheck();
  });
  
  if (checkMoves.length > 0) {
    const randomCheck = checkMoves[Math.floor(Math.random() * checkMoves.length)];
    return {
      from: randomCheck.from,
      to: randomCheck.to,
      promotion: randomCheck.promotion,
    };
  }

  // Otherwise make a random move
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  return {
    from: randomMove.from,
    to: randomMove.to,
    promotion: randomMove.promotion,
  };
};

// Advanced AI using minimax algorithm (simplified version)
export const getBestMove = (game: Chess, depth: number = 2): ChessMove | null => {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  let bestMove: ChessMove | null = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const testGame = new Chess(game.fen());
    testGame.move(move);
    
    const score = minimax(testGame, depth - 1, false, -Infinity, Infinity);
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = {
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      };
    }
  }

  return bestMove;
};

const minimax = (game: Chess, depth: number, isMaximizing: boolean, alpha: number, beta: number): number => {
  if (depth === 0 || game.isGameOver()) {
    return evaluatePosition(game);
  }

  const moves = game.moves({ verbose: true });
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const testGame = new Chess(game.fen());
      testGame.move(move);
      const evaluation = minimax(testGame, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const testGame = new Chess(game.fen());
      testGame.move(move);
      const evaluation = minimax(testGame, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const evaluatePosition = (game: Chess): number => {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -1000 : 1000;
  }
  
  if (game.isDraw()) {
    return 0;
  }

  // Simple piece value evaluation
  const pieceValues: Record<string, number> = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
  };

  let score = 0;
  const board = game.board();
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const value = pieceValues[piece.type.toLowerCase()];
        score += piece.color === 'w' ? value : -value;
      }
    }
  }

  return score;
};

// AI move selector based on difficulty level
export const getAIMove = (game: Chess, difficulty: Difficulty = 'medium'): ChessMove | null => {
  switch (difficulty) {
    case 'easy':
      return getRandomMove(game);
    case 'medium':
      return getSmartMove(game);
    case 'hard':
      return getBestMove(game, 3);
    case 'grandmaster':
      return getBestMove(game, 5);
    default:
      return getSmartMove(game);
  }
};
