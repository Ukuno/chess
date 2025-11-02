'use client';

import { GameMode, GameStatus, Difficulty } from '@/types/chess';

interface GameControlsProps {
  gameMode: GameMode;
  gameStatus: GameStatus;
  currentPlayer: 'w' | 'b';
  winner?: 'w' | 'b' | 'draw';
  onNewGame: () => void;
  onGameModeChange: (mode: GameMode) => void;
  moveHistory: string[];
  difficulty?: Difficulty;
  onDifficultyChange?: (difficulty: Difficulty) => void;
}

export default function GameControls({
  gameMode,
  gameStatus,
  currentPlayer,
  winner,
  onNewGame,
  onGameModeChange,
  moveHistory,
  difficulty = 'medium',
  onDifficultyChange,
}: GameControlsProps) {
  const getStatusMessage = () => {
    if (gameStatus === 'checkmate') {
      return winner === 'w' ? 'White wins by checkmate!' : 'Black wins by checkmate!';
    }
    if (gameStatus === 'stalemate') {
      return 'Stalemate - Draw!';
    }
    if (gameStatus === 'draw') {
      return 'Draw!';
    }
    return currentPlayer === 'w' ? "White's turn" : "Black's turn";
  };

  const getStatusColor = () => {
    if (gameStatus !== 'playing') {
      return 'text-green-600 font-bold';
    }
    return currentPlayer === 'w' ? 'text-white' : 'text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      {/* Game Status */}
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2 text-black">Game Status</h2>
        <p className={`text-lg ${getStatusColor()}`}>
          {getStatusMessage()}
        </p>
      </div>

      {/* Game Mode Selection */}
      <div className="space-y-2">
        <h3 className="font-semibold text-black">Game Mode</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onGameModeChange('human-vs-human')}
            className={`px-4 py-2 rounded ${
              gameMode === 'human-vs-human'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Human vs Human
          </button>
          <button
            onClick={() => onGameModeChange('human-vs-ai')}
            className={`px-4 py-2 rounded ${
              gameMode === 'human-vs-ai'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Human vs AI
          </button>
        </div>
      </div>

      {/* Difficulty Selection - Only show in Human vs AI mode */}
      {gameMode === 'human-vs-ai' && onDifficultyChange && (
        <div className="space-y-2">
          <h3 className="font-semibold text-black">AI Difficulty</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDifficultyChange('easy')}
              className={`px-3 py-2 rounded text-sm ${
                difficulty === 'easy'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Easy
            </button>
            <button
              onClick={() => onDifficultyChange('medium')}
              className={`px-3 py-2 rounded text-sm ${
                difficulty === 'medium'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => onDifficultyChange('hard')}
              className={`px-3 py-2 rounded text-sm ${
                difficulty === 'hard'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Hard
            </button>
            <button
              onClick={() => onDifficultyChange('grandmaster')}
              className={`px-3 py-2 rounded text-sm ${
                difficulty === 'grandmaster'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Grandmaster
            </button>
          </div>
        </div>
      )}

      {/* New Game Button */}
      <div className="text-center">
        <button
          onClick={onNewGame}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Move History */}
      {moveHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-black">Move History</h3>
          <div className="bg-gray-100 p-3 rounded max-h-32 overflow-y-auto move-history">
            <div className="text-sm space-y-1">
              {moveHistory.map((move, index) => (
                <div key={index} className="flex justify-between">
                  <span className="font-mono text-black">
                    {Math.floor(index / 2) + 1}. {index % 2 === 0 ? move : ''}
                  </span>
                  {index % 2 === 1 && <span className="font-mono text-black">{move}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
