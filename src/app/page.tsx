'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Chess } from 'chess.js';
import { useSound } from '@/hooks/useSound';

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
    undoMove,
    resign,
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
    if (result) {
      playSound(gameState.gameMode === 'puzzle' ? 'gameover' : 'move');
    }

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
  const [showAnswer, setShowAnswer] = useState(false);
  const [flipBoard, setFlipBoard] = useState(false);
  const lastReportedGameRef = useRef<string | null>(null);
  const lastReportedPuzzleRef = useRef<string | null>(null);
  const { play: playSound, muted, setMute } = useSound();

  // Report game result to stats (once per game)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const { status: gameStatus, gameMode, winner, fen } = gameState;
    if (gameMode !== 'human-vs-ai' && gameMode !== 'multiplayer') return;
    if (gameStatus !== 'checkmate' && gameStatus !== 'stalemate' && gameStatus !== 'draw' && gameStatus !== 'resigned') return;
    const key = `${fen}-${gameStatus}`;
    if (lastReportedGameRef.current === key) return;
    lastReportedGameRef.current = key;
    const result = gameStatus === 'draw' ? 'draw' : gameStatus === 'resigned'
      ? 'loss'
      : gameMode === 'human-vs-ai'
        ? (winner === 'w' ? 'win' : 'loss')
        : (winner === playerColor ? 'win' : winner === 'draw' ? 'draw' : 'loss');
    fetch('/api/stats/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'game_result', result }),
    }).catch(console.error);
    playSound('gameover');
  }, [gameState.status, gameState.gameMode, gameState.winner, gameState.fen, status, playerColor, playSound]);

  // Report puzzle attempt to stats (once per puzzle result)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const { status: gameStatus, currentPuzzle } = gameState;
    if (gameStatus !== 'puzzle-solved' && gameStatus !== 'puzzle-failed') return;
    const key = currentPuzzle ? `${currentPuzzle.id}-${gameStatus}` : gameStatus;
    if (lastReportedPuzzleRef.current === key) return;
    lastReportedPuzzleRef.current = key;
    fetch('/api/stats/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'puzzle_attempt', solved: gameStatus === 'puzzle-solved' }),
    }).catch(console.error);
  }, [gameState.status, gameState.currentPuzzle, status]);

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
            <div className="flex justify-evenly items-center mb-4">
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
        <div className=" mb-8">
          <div className="flex justify-evenly items-center mb-4">
            {/* <div className="flex-1"></div> */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">
                Chess Game
              </h1>
              <p className="text-blue-200">
                Play against AI or another human player
              </p>
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
              <button
                type="button"
                onClick={() => setMute(!muted)}
                className="text-white hover:text-blue-200 text-sm"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? '🔇 Sound off' : '🔊 Sound on'}
              </button>
              <Link href="/profile" className="text-white hover:text-blue-200 text-sm">Profile</Link>
              <Link href="/leaderboard" className="text-white hover:text-blue-200 text-sm">Leaderboard</Link>
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
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-700 font-semibold">
                        {gameState.currentPuzzle.description}
                      </p>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Puzzle #{gameState.currentPuzzle.id}
                      </span>
                    </div>
                    {gameState.currentPuzzle.hint && gameState.status === 'puzzle-failed' && (
                      <p className="text-sm text-gray-500 mt-1">
                        💡 Hint: {gameState.currentPuzzle.hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {(gameState.gameMode === 'human-vs-human' || gameState.gameMode === 'human-vs-ai') && gameState.status === 'playing' && game.history().length > 0 && (
                        <button
                          type="button"
                          onClick={undoMove}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm font-medium"
                        >
                          Undo
                        </button>
                      )}
                      {(gameState.gameMode === 'human-vs-human' || gameState.gameMode === 'human-vs-ai') && gameState.status === 'playing' && (
                        <button
                          type="button"
                          onClick={resign}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium"
                        >
                          Resign
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setFlipBoard((b) => !b)}
                        className="px-3 py-1.5 bg-yellow-200 hover:bg-yellow-300 rounded text-gray-700 text-sm font-medium"
                      >
                        Flip board
                      </button>
                    </div>
                  </div>
                  <SimpleChessBoard
                    position={gameState.fen}
                    onMove={handleMove}
                    isPlayerTurn={isPlayerTurn}
                    gameMode={gameState.gameMode}
                    currentPlayer={gameState.currentPlayer}
                    getLegalMoves={getLegalMoves}
                    orientation={flipBoard ? 'black' : 'white'}
                  />
                </div>
                {gameState.moveHistory && gameState.moveHistory.length > 0 && (
                  <div className="w-48 max-h-64 overflow-y-auto bg-gray-50 rounded p-2 text-sm">
                    <p className="font-semibold text-gray-700 mb-1">Moves</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {gameState.moveHistory.map((move, i) => (
                        <span key={i} className="text-gray-600">{move}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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
                            setShowAnswer(false);
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
                      {showAnswer && gameState.currentPuzzle && (() => {
                        // Convert UCI to algebraic notation
                        const solution = gameState.currentPuzzle.solution;
                        const from = solution.substring(0, 2);
                        const to = solution.substring(2, 4);
                        const promotion = solution.length > 4 ? solution.substring(4) : undefined;
                        
                        try {
                          const tempGame = new Chess(gameState.currentPuzzle.fen);
                          const move = tempGame.move({
                            from,
                            to,
                            promotion: promotion as any
                          });
                          const algebraicNotation = move ? move.san : `${from.toUpperCase()} → ${to.toUpperCase()}`;
                          
                          return (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                              <strong>💡 Answer:</strong> <span className="font-mono font-bold text-lg">{algebraicNotation}</span>
                              <br />
                              <span className="text-sm text-gray-600 mt-1 block">{gameState.currentPuzzle.description}</span>
                            </div>
                          );
                        } catch {
                          return (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                              <strong>💡 Answer:</strong> <span className="font-mono font-bold text-lg">{from.toUpperCase()} → {to.toUpperCase()}</span>
                              <br />
                              <span className="text-sm text-gray-600 mt-1 block">{gameState.currentPuzzle.description}</span>
                            </div>
                          );
                        }
                      })()}
                      <div className="mt-3 space-x-2">
                        <button
                          onClick={() => {
                            if (gameState.currentPuzzle) {
                              startPuzzle(gameState.currentPuzzle);
                              setShowAnswer(false);
                            }
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          Retry Puzzle
                        </button>
                        <button
                          onClick={() => {
                            setShowAnswer(!showAnswer);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                          {showAnswer ? 'Hide Answer' : 'Show Answer'}
                        </button>
                        <button
                          onClick={() => {
                            const puzzle = getRandomPuzzle(gameState.currentPuzzle?.difficulty);
                            startPuzzle(puzzle);
                            setShowAnswer(false);
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
                <div className="mt-6 text-center space-y-2">
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
                    {gameState.status === 'resigned' && (
                      <span>
                        {gameState.winner === 'w' ? 'White' : 'Black'} wins by resignation.
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const pgn = game.pgn();
                        navigator.clipboard.writeText(pgn);
                        alert('PGN copied to clipboard!');
                      } catch {
                        alert('Could not copy PGN');
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm font-medium"
                  >
                    Copy PGN
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-black mb-4">How to Play</h3>
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