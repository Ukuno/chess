'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { GameState, GameMode, ChessMove, Difficulty } from '@/types/chess';

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
      // Use the move object directly with chess.js
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
      return false;
    }
  }, [game, updateGameState]);

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

  const getLegalMoves = useCallback((square: string) => {
    return game.moves({ square, verbose: true });
  }, [game]);

  const isGameOver = gameState.status !== 'playing';

  return {
    game,
    gameState,
    makeMove,
    startNewGame,
    setGameModeAndStartNew,
    setDifficultyAndRestart,
    getLegalMoves,
    isGameOver,
  };
};
