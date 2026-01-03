const { Chess } = require('chess.js');

// Import puzzles data - we'll need to convert it to CommonJS format
const puzzles = [
  {
    id: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: 'c4f7',
    description: 'Find the winning move! White to move and win material.',
    difficulty: 'easy',
  },
  {
    id: 2,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: 'f3g5',
    description: 'Develop your knight with a threat.',
    difficulty: 'easy',
  },
  {
    id: 3,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2',
    solution: 'e5e4',
    description: 'Black to move. Find the best continuation.',
    difficulty: 'easy',
  },
  {
    id: 4,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: 'e1g1',
    description: 'Castle to safety and connect your rooks.',
    difficulty: 'easy',
  },
  {
    id: 6,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: 'c4f7',
    description: 'Tactical shot! Win material with a discovered attack.',
    difficulty: 'medium',
  },
];

console.log('Validating puzzles...\n');

const invalidPuzzles = [];
const validPuzzles = [];

puzzles.forEach((puzzle) => {
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
      invalidPuzzles.push({
        id: puzzle.id,
        error: `No piece at ${from}`,
        puzzle
      });
      return;
    }
    
    const isCorrectColor = (turn === 'w' && piece.color === 'w') || (turn === 'b' && piece.color === 'b');
    if (!isCorrectColor) {
      invalidPuzzles.push({
        id: puzzle.id,
        error: `Wrong color - turn is ${turn} but piece at ${from} is ${piece.color}`,
        puzzle
      });
      return;
    }
    
    // Try to make the move
    const move = game.move({
      from,
      to,
      promotion: promotion || undefined
    });
    
    if (move) {
      validPuzzles.push({
        id: puzzle.id,
        move: move.san,
        puzzle
      });
      console.log(`✓ Puzzle ${puzzle.id}: Valid - ${move.san}`);
    } else {
      invalidPuzzles.push({
        id: puzzle.id,
        error: 'Move is not legal',
        puzzle
      });
    }
  } catch (error) {
    invalidPuzzles.push({
      id: puzzle.id,
      error: error.message,
      puzzle
    });
  }
});

console.log(`\n\nSummary:`);
console.log(`Valid: ${validPuzzles.length}`);
console.log(`Invalid: ${invalidPuzzles.length}\n`);

if (invalidPuzzles.length > 0) {
  console.log('Invalid Puzzles:');
  invalidPuzzles.forEach(({ id, error, puzzle }) => {
    console.log(`\nPuzzle ${id}: ${error}`);
    console.log(`  FEN: ${puzzle.fen}`);
    console.log(`  Solution: ${puzzle.solution}`);
    console.log(`  Description: ${puzzle.description}`);
  });
}

