'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { GameState, GameMode, ChessMove, Difficulty, ChessPuzzle } from '@/types/chess';

const STORAGE_KEY = 'chess-game-state';

export const useChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-human');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<GameState>({
    fen: game.fen(),
    gameMode: 'human-vs-human',
    status: 'playing',
    currentPlayer: 'w',
    moveHistory: [],
    difficulty: 'medium',
  });

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const chess = new Chess(parsedState.fen);
        setGame(chess);
        setGameState(parsedState);
        if (parsedState.difficulty) {
          setDifficulty(parsedState.difficulty);
        }
      } catch (error) {
        console.error('Failed to load saved game state:', error);
      }
    }
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  const updateGameState = useCallback(() => {
    const status = game.isCheckmate() ? 'checkmate' : 
                   game.isStalemate() ? 'stalemate' : 
                   game.isDraw() ? 'draw' : 'playing';

    const winner = status === 'checkmate' ? (game.turn() === 'w' ? 'b' : 'w') : 
                   status === 'draw' ? 'draw' : undefined;

    setGameState({
      fen: game.fen(),
      gameMode,
      status,
      currentPlayer: game.turn(),
      winner,
      moveHistory: game.history(),
      difficulty,
    });
  }, [game, gameMode, difficulty]);

  const makeMove = useCallback((move: ChessMove) => {
    try {
      // In puzzle mode, check if the move matches the solution
      if (gameMode === 'puzzle' && gameState.currentPuzzle) {
        const moveUCI = `${move.from}${move.to}${move.promotion || ''}`;
        const solution = gameState.currentPuzzle.solution;
        
        // Check if move matches solution
        if (moveUCI === solution || moveUCI === solution.substring(0, 4)) {
          // Correct move!
          const result = game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion
          });
          if (result) {
            setGameState(prev => ({
              ...prev,
              fen: game.fen(),
              status: 'puzzle-solved',
              puzzleSolved: true,
              moveHistory: game.history(),
            }));
            return true;
          }
        } else {
          // Wrong move
          setGameState(prev => ({
            ...prev,
            status: 'puzzle-failed',
            puzzleSolved: false,
          }));
          return false;
        }
      }
      
      // Normal game mode
      const result = game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
      if (result) {
        updateGameState();
        return true;
      }
      return false;
    } catch (error) {
      // console.error('Invalid move:', error);
      if (gameMode === 'puzzle') {
        setGameState(prev => ({
          ...prev,
          status: 'puzzle-failed',
          puzzleSolved: false,
        }));
      }
      return false;
    }
  }, [game, updateGameState, gameMode, gameState.currentPuzzle]);

  const startNewGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setGameState({
      fen: newGame.fen(),
      gameMode,
      status: 'playing',
      currentPlayer: 'w',
      moveHistory: [],
      difficulty,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, [gameMode, difficulty]);

  const setGameModeAndStartNew = useCallback((mode: GameMode) => {
    setGameMode(mode);
    // Don't reset game for multiplayer mode - it will be set from server
    if (mode !== 'multiplayer') {
      const newGame = new Chess();
      setGame(newGame);
      setGameState({
        fen: newGame.fen(),
        gameMode: mode,
        status: 'playing',
        currentPlayer: 'w',
        moveHistory: [],
        difficulty,
      });
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [difficulty]);

  const setDifficultyAndRestart = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    const newGame = new Chess();
    setGame(newGame);
    setGameState({
      fen: newGame.fen(),
      gameMode,
      status: 'playing',
      currentPlayer: 'w',
      moveHistory: [],
      difficulty: newDifficulty,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, [gameMode]);

  const startPuzzle = useCallback((puzzle: ChessPuzzle) => {
    setGameMode('puzzle');
    const puzzleGame = new Chess(puzzle.fen);
    setGame(puzzleGame);
    setGameState({
      fen: puzzle.fen,
      gameMode: 'puzzle',
      status: 'playing',
      currentPlayer: puzzle.fen.split(' ')[1] === 'w' ? 'w' : 'b',
      moveHistory: [],
      currentPuzzle: puzzle,
      puzzleSolved: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const nextPuzzle = useCallback((difficulty?: Difficulty) => {
    // This will be called from the component with a new puzzle
    // For now, just reset the puzzle state
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      puzzleSolved: false,
    }));
  }, []);

  const getLegalMoves = useCallback((square: string) => {
    return game.moves({ square, verbose: true });
  }, [game]);

  const updateMultiplayerGame = useCallback((fen: string, moveHistory: string[], status: string, currentPlayer: 'w' | 'b', winner?: 'w' | 'b' | 'draw', gameId?: string, playerColor?: 'w' | 'b') => {
    const chess = new Chess(fen);
    setGame(chess);
    
    const gameStatus = status === 'playing' ? 'playing' : 
                      status === 'finished' ? (winner === 'w' ? 'checkmate' : winner === 'b' ? 'checkmate' : 'draw') : 'playing';
    
    setGameState(prev => ({
      ...prev,
      fen,
      status: gameStatus,
      currentPlayer,
      winner,
      moveHistory: moveHistory || [],
      multiplayerGameId: gameId,
      playerColor,
    }));
  }, []);

  const isGameOver = gameState.status !== 'playing' && 
                     gameState.status !== 'puzzle-solved' && 
                     gameState.status !== 'puzzle-failed';

  return {
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
  };
};
