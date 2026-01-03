import { Chess } from 'chess.js';
import { ChessPuzzle } from '@/types/chess';

export function validatePuzzle(puzzle: ChessPuzzle): { valid: boolean; error?: string } {
  try {
    const game = new Chess(puzzle.fen);
    const solution = puzzle.solution;
    const from = solution.substring(0, 2);
    const to = solution.substring(2, 4);
    const promotion = solution.length > 4 ? solution.substring(4) : undefined;
    
    // Check if it's the correct player's turn
    const turn = puzzle.fen.split(' ')[1];
    const piece = game.get(from);
    
    if (!piece) {
      return { valid: false, error: `No piece at ${from}` };
    }
    
    const isCorrectColor = (turn === 'w' && piece.color === 'w') || (turn === 'b' && piece.color === 'b');
    if (!isCorrectColor) {
      return { valid: false, error: `Wrong color - turn is ${turn} but piece at ${from} is ${piece.color}` };
    }
    
    // Try to make the move to validate it's legal
    const move = game.move({
      from,
      to,
      promotion: promotion as any
    });
    
    if (!move) {
      return { valid: false, error: `Solution move ${solution} is not legal from FEN ${puzzle.fen}` };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Unknown error' };
  }
}

