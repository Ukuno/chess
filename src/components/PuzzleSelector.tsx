'use client';

import { useState } from 'react';
import { ChessPuzzle, Difficulty } from '@/types/chess';
import { getRandomPuzzle, getPuzzlesByDifficulty } from '@/data/chessPuzzles';

interface PuzzleSelectorProps {
  onPuzzleSelect: (puzzle: ChessPuzzle) => void;
  currentDifficulty?: Difficulty;
}

export default function PuzzleSelector({ onPuzzleSelect, currentDifficulty }: PuzzleSelectorProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(currentDifficulty || 'medium');

  const handleRandomPuzzle = () => {
    const puzzle = getRandomPuzzle(selectedDifficulty);
    onPuzzleSelect(puzzle);
  };

  const handleDifficultyPuzzle = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    const puzzles = getPuzzlesByDifficulty(difficulty);
    if (puzzles.length > 0) {
      const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
      onPuzzleSelect(puzzle);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <h3 className="text-xl font-semibold text-black mb-4">Puzzle Challenge</h3>
      
      <div className="space-y-3">
        <p className="text-gray-700 text-sm">
          Test your chess skills! Find the best move in each puzzle.
        </p>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-black">Select Difficulty:</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDifficultyPuzzle('easy')}
              className={`px-3 py-2 rounded text-sm ${
                selectedDifficulty === 'easy'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Easy
            </button>
            <button
              onClick={() => handleDifficultyPuzzle('medium')}
              className={`px-3 py-2 rounded text-sm ${
                selectedDifficulty === 'medium'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => handleDifficultyPuzzle('hard')}
              className={`px-3 py-2 rounded text-sm ${
                selectedDifficulty === 'hard'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hard
            </button>
            <button
              onClick={() => handleDifficultyPuzzle('grandmaster')}
              className={`px-3 py-2 rounded text-sm ${
                selectedDifficulty === 'grandmaster'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Grandmaster
            </button>
          </div>
        </div>

        <button
          onClick={handleRandomPuzzle}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Start Random Puzzle ({selectedDifficulty})
        </button>
      </div>
    </div>
  );
}

