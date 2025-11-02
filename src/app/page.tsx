'use client';

import { useEffect } from 'react';
import { useChessGame } from '@/hooks/useChessGame';
import SimpleChessBoard from '@/components/SimpleChessBoard';
import GameControls from '@/components/GameControls';
import { getAIMove } from '@/utils/chessAI';

export default function Home() {
  const {
    game,
    gameState,
    makeMove,
    startNewGame,
    setGameModeAndStartNew,
    setDifficultyAndRestart,
    getLegalMoves,
    isGameOver,
  } = useChessGame();

  // AI move logic for human vs AI mode
  useEffect(() => {
    if (
      gameState.gameMode === 'human-vs-ai' &&
      gameState.currentPlayer === 'b' &&
      !isGameOver
    ) {
      const timer = setTimeout(() => {
        const difficulty = gameState.difficulty || 'medium';
        const aiMove = getAIMove(game, difficulty);
        if (aiMove) {
          makeMove(aiMove);
        }
      }, 1000); // 1 second delay for AI move

      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gameMode, gameState.difficulty, isGameOver, game, makeMove]);

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    return makeMove(move);
  };

  const isPlayerTurn = gameState.gameMode === 'human-vs-human' || 
                      (gameState.gameMode === 'human-vs-ai' && gameState.currentPlayer === 'w');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Chess Game
          </h1>
          <p className="text-blue-200">
            Play against AI or another human player
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="lg:col-span-1">
            <GameControls
              gameMode={gameState.gameMode}
              gameStatus={gameState.status}
              currentPlayer={gameState.currentPlayer}
              winner={gameState.winner}
              onNewGame={startNewGame}
              onGameModeChange={setGameModeAndStartNew}
              moveHistory={gameState.moveHistory}
              difficulty={gameState.difficulty}
              onDifficultyChange={setDifficultyAndRestart}
            />
          </div>

          {/* Chess Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Chess Board
                </h2>
                {gameState.gameMode === 'human-vs-ai' && (
                  <p className="text-gray-600">
                    You are playing as White
                  </p>
                )}
              </div>
              
              <SimpleChessBoard
                position={gameState.fen}
                onMove={handleMove}
                isPlayerTurn={isPlayerTurn}
                gameMode={gameState.gameMode}
                currentPlayer={gameState.currentPlayer}
                getLegalMoves={getLegalMoves}
              />

              {/* Game Over Message */}
              {isGameOver && (
                <div className="mt-6 text-center">
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <strong>Game Over!</strong>
                    <br />
                    {gameState.status === 'checkmate' && (
                      <span>
                        {gameState.winner === 'w' ? 'White' : 'Black'} wins by checkmate!
                      </span>
                    )}
                    {gameState.status === 'stalemate' && (
                      <span>Stalemate - It's a draw!</span>
                    )}
                    {gameState.status === 'draw' && (
                      <span>The game is a draw!</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">How to Play</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Game Modes</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• <strong>Human vs Human:</strong> Two players take turns</li>
                <li>• <strong>Human vs AI:</strong> Play against the computer</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Controls</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Click on a piece to select it</li>
                <li>• Click on a destination square to move</li>
                <li>• Right-click to highlight squares</li>
                <li>• Use "New Game" to start fresh</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}