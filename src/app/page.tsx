'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useChessGame } from '@/hooks/useChessGame';
import SimpleChessBoard from '@/components/SimpleChessBoard';
import GameControls from '@/components/GameControls';
import PuzzleSelector from '@/components/PuzzleSelector';
import GameLobby from '@/components/GameLobby';
import AuthButton from '@/components/AuthButton';
import { getAIMove } from '@/utils/chessAI';
import { getRandomPuzzle } from '@/data/chessPuzzles';

export default function Home() {
  const { data: session, status } = useSession();
  const {
    game,
    gameState,
    makeMove,
    startNewGame,
    setGameModeAndStartNew,
    setDifficultyAndRestart,
    startPuzzle,
    nextPuzzle,
    updateMultiplayerGame,
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

  const handleMove = async (move: { from: string; to: string; promotion?: string }) => {
    const result = makeMove(move);
    
    // If multiplayer mode, sync move to server
    if (gameState.gameMode === 'multiplayer' && multiplayerGameId && result) {
      try {
        // Wait a tick to let game state update
        await new Promise(resolve => setTimeout(resolve, 0));
        
        await fetch(`/api/games/${multiplayerGameId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fen: game.fen(),
            moveHistory: game.history(),
            status: game.isGameOver() ? 'finished' : 'playing',
            winner: game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : 
                   game.isDraw() ? 'draw' : undefined,
            currentPlayer: game.turn(),
          }),
        });
      } catch (error) {
        console.error('Error syncing move to server:', error);
      }
    }
    
    return result;
  };

  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [opponentLeftMessage, setOpponentLeftMessage] = useState<string | null>(null);

  const handleMultiplayerStart = async (gameId: string, color: 'w' | 'b') => {
    setMultiplayerGameId(gameId);
    setPlayerColor(color);
    setGameModeAndStartNew('multiplayer');
    
    // Fetch initial game state with a small delay to ensure mode is set
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        if (response.ok) {
          const { game: serverGame } = await response.json();
          if (serverGame) {
            updateMultiplayerGame(
              serverGame.fen,
              serverGame.moveHistory || [],
              serverGame.status,
              serverGame.currentPlayer as 'w' | 'b',
              serverGame.winner as 'w' | 'b' | 'draw' | undefined,
              serverGame.gameId,
              color
            );
          }
        }
      } catch (error) {
        console.error('Error fetching initial game state:', error);
      }
    }, 100);
  };

  // Poll for game updates in multiplayer mode
  useEffect(() => {
    if (gameState.gameMode === 'multiplayer' && multiplayerGameId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/games/${multiplayerGameId}`);
          if (response.ok) {
            const { game: serverGame } = await response.json();
            if (serverGame) {
              // Check if the game has been abandoned
              if (serverGame.status === 'abandoned' && serverGame.abandonedBy !== playerColor) {
                // The opponent has abandoned - show message and switch to local play
                setOpponentLeftMessage('Your opponent has left the session. Switching to local play...');
                setTimeout(() => {
                  setMultiplayerGameId(null);
                  setPlayerColor(null);
                  setGameModeAndStartNew('human-vs-human');
                  setOpponentLeftMessage(null);
                }, 3000); // Show message for 3 seconds before switching
                return;
              }

              // Check if opponent started a new multiplayer game (blackPlayerId removed or game reset with status 'waiting')
              if (serverGame.status === 'waiting' && playerColor === 'b' && serverGame.blackPlayerId === null) {
                // Host (white) started a new game, leaving this one
                setOpponentLeftMessage('Your opponent started a new game. Switching to local play...');
                setTimeout(() => {
                  setMultiplayerGameId(null);
                  setPlayerColor(null);
                  setGameModeAndStartNew('human-vs-human');
                  setOpponentLeftMessage(null);
                }, 3000);
                return;
              }

              // Only update if the FEN has changed (opponent made a move)
              if (serverGame.fen !== gameState.fen) {
                updateMultiplayerGame(
                  serverGame.fen,
                  serverGame.moveHistory || [],
                  serverGame.status,
                  serverGame.currentPlayer as 'w' | 'b',
                  serverGame.winner as 'w' | 'b' | 'draw' | undefined,
                  serverGame.gameId,
                  playerColor || undefined
                );
              }
            }
          }
        } catch (error) {
          console.error('Error fetching game state:', error);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [gameState.gameMode, multiplayerGameId, playerColor, gameState.fen, updateMultiplayerGame, setGameModeAndStartNew]);

  const isPlayerTurn = gameState.gameMode === 'human-vs-human' || 
                      (gameState.gameMode === 'human-vs-ai' && gameState.currentPlayer === 'w') ||
                      gameState.gameMode === 'puzzle' ||
                      (gameState.gameMode === 'multiplayer' && gameState.currentPlayer === playerColor);

  // Clear multiplayer game when switching away from multiplayer mode
  useEffect(() => {
    if (gameState.gameMode !== 'multiplayer' && multiplayerGameId) {
      setMultiplayerGameId(null);
      setPlayerColor(null);
      startNewGame();
    }
  }, [gameState.gameMode, multiplayerGameId, startNewGame]);

  const handleLeaveMultiplayer = async () => {
    // Notify server that this player is abandoning the game
    if (multiplayerGameId && playerColor) {
      try {
        await fetch(`/api/games/${multiplayerGameId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fen: game.fen(),
            moveHistory: game.history(),
            status: 'abandoned',
            abandoned: playerColor,
            currentPlayer: game.turn(),
          }),
        });
      } catch (error) {
        console.error('Error notifying game abandonment:', error);
      }
    }

    setMultiplayerGameId(null);
    setPlayerColor(null);
    setGameModeAndStartNew('human-vs-human');
  };

  const handleNewGameInMultiplayer = async () => {
    // If in multiplayer mode, reset the game within the same session
    if (gameState.gameMode === 'multiplayer' && multiplayerGameId && playerColor) {
      try {
        // Reset the game on the server
        await fetch(`/api/games/${multiplayerGameId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            moveHistory: [],
            status: 'playing',
            currentPlayer: 'w',
            winner: undefined,
          }),
        });
        
        // Reset local game state
        startNewGame();
      } catch (error) {
        console.error('Error resetting game:', error);
      }
    } else {
      // For other modes, just start a new game
      startNewGame();
    }
  };

  const handleNewMultiplayerGame = async () => {
    // If in multiplayer mode, reset multiplayer state and return to lobby
    if (gameState.gameMode === 'multiplayer') {
      setMultiplayerGameId(null);
      setPlayerColor(null);
      // Game mode stays as multiplayer, GameLobby will show
    } else {
      // For other modes, just start a new game
      startNewGame();
    }
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (status === 'unauthenticated' || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1"></div>
              <div className="flex-1 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">
                  Chess Game
                </h1>
                <p className="text-blue-200">
                  Play against AI or another human player
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                <AuthButton />
              </div>
            </div>
          </div>

          {/* Login Prompt */}
          <div className="max-w-2xl mx-auto mt-16">
            <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Welcome to Chess Game
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Please sign in to play chess, solve puzzles, and track your progress.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/login"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
                >
                  Create Account
                </Link>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">🎮 Play Chess</h4>
                    <p className="text-sm text-gray-600">Play against AI or another player</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">🧩 Solve Puzzles</h4>
                    <p className="text-sm text-gray-600">Challenge yourself with chess puzzles</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">📊 Track Stats</h4>
                    <p className="text-sm text-gray-600">Monitor your progress and achievements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show game for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold text-white mb-2">
                Chess Game
              </h1>
              <p className="text-blue-200">
                Play against AI or another human player
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <AuthButton />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Controls / Puzzle Selector / Game Lobby */}
          <div className="lg:col-span-1">
            {gameState.gameMode === 'puzzle' && !gameState.currentPuzzle ? (
              <PuzzleSelector
                onPuzzleSelect={startPuzzle}
                currentDifficulty={gameState.difficulty}
              />
            ) : gameState.gameMode === 'multiplayer' && !multiplayerGameId ? (
              <GameLobby onGameStart={handleMultiplayerStart} onModeChange={setGameModeAndStartNew} />
            ) : (
              <GameControls
                gameMode={gameState.gameMode}
                gameStatus={gameState.status}
                currentPlayer={gameState.currentPlayer}
                winner={gameState.winner}
                onNewGame={handleNewGameInMultiplayer}
                onGameModeChange={setGameModeAndStartNew}
                moveHistory={gameState.moveHistory}
                difficulty={gameState.difficulty}
                onDifficultyChange={setDifficultyAndRestart}
                onLeaveMultiplayer={gameState.gameMode === 'multiplayer' ? handleLeaveMultiplayer : undefined}
              />
            )}
          </div>

          {/* Chess Board */}
          <div className="lg:col-span-2">
            {/* Opponent Left Notification */}
            {opponentLeftMessage && (
              <div className="mb-4 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
                <strong>⚠️ Notice:</strong> {opponentLeftMessage}
              </div>
            )}
            
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
                {gameState.gameMode === 'multiplayer' && playerColor && (
                  <p className="text-gray-600">
                    You are playing as {playerColor === 'w' ? 'White' : 'Black'}
                    {multiplayerGameId && (
                      <span className="ml-2 text-sm">Game ID: {multiplayerGameId}</span>
                    )}
                  </p>
                )}
                {gameState.gameMode === 'puzzle' && gameState.currentPuzzle && (
                  <div className="mt-2">
                    <p className="text-gray-700 font-semibold">
                      {gameState.currentPuzzle.description}
                    </p>
                    {gameState.currentPuzzle.hint && gameState.status === 'puzzle-failed' && (
                      <p className="text-sm text-gray-500 mt-1">
                        💡 Hint: {gameState.currentPuzzle.hint}
                      </p>
                    )}
                  </div>
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

              {/* Puzzle Solved / Failed Message */}
              {gameState.gameMode === 'puzzle' && (
                <div className="mt-6 text-center space-y-3">
                  {gameState.status === 'puzzle-solved' && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                      <strong>🎉 Congratulations!</strong>
                      <br />
                      <span>You solved the puzzle!</span>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            const puzzle = getRandomPuzzle(gameState.currentPuzzle?.difficulty);
                            startPuzzle(puzzle);
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          Next Puzzle
                        </button>
                      </div>
                    </div>
                  )}
                  {gameState.status === 'puzzle-failed' && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      <strong>❌ Wrong Move!</strong>
                      <br />
                      <span>Try again or select a new puzzle.</span>
                      <div className="mt-3 space-x-2">
                        <button
                          onClick={() => {
                            if (gameState.currentPuzzle) {
                              startPuzzle(gameState.currentPuzzle);
                            }
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          Retry Puzzle
                        </button>
                        <button
                          onClick={() => {
                            const puzzle = getRandomPuzzle(gameState.currentPuzzle?.difficulty);
                            startPuzzle(puzzle);
                          }}
                          className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          New Puzzle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Game Over Message */}
              {isGameOver && gameState.gameMode !== 'puzzle' && (
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
                <li>• <strong>Local Play:</strong> Two players on the same device take turns</li>
                <li>• <strong>Multiplayer:</strong> Play with another user on a different device</li>
                <li>• <strong>Human vs AI:</strong> Play against the computer</li>
                <li>• <strong>Puzzle Challenge:</strong> Solve chess puzzles to improve your skills</li>
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