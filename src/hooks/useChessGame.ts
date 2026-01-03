'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { GameState, GameMode, ChessMove, Difficulty, ChessPuzzle } from '@/types/chess';
import { validatePuzzle } from '@/utils/validatePuzzle';

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
        // Ensure we're using the correct game state - create a fresh instance from puzzle FEN
        const puzzleGame = new Chess(gameState.currentPuzzle.fen);
        
        const moveUCI = `${move.from}${move.to}${move.promotion || ''}`;
        const solution = gameState.currentPuzzle.solution;
        
        // Normalize solution (remove promotion if not specified in move)
        const solutionBase = solution.substring(0, 4);
        const moveBase = moveUCI.substring(0, 4);
        
        // Check if move matches solution (exact match or base match)
        if (moveUCI === solution || moveBase === solutionBase) {
          // Verify the move is actually legal before accepting it
          try {
            const result = puzzleGame.move({
              from: move.from,
              to: move.to,
              promotion: move.promotion as any
            });
            if (result) {
              // Update the game state with the new position
              setGame(puzzleGame);
              setGameState(prev => ({
                ...prev,
                fen: puzzleGame.fen(),
                status: 'puzzle-solved',
                puzzleSolved: true,
                moveHistory: puzzleGame.history(),
              }));
              return true;
            }
          } catch (moveError) {
            // Move is not legal even though it matches solution - puzzle might be invalid
            console.error('Puzzle solution move is not legal:', moveError);
            setGameState(prev => ({
              ...prev,
              status: 'puzzle-failed',
              puzzleSolved: false,
            }));
            return false;
          }
        } else {
          // Wrong move - check if it's at least legal (for user feedback)
          try {
            const testMove = puzzleGame.move({
              from: move.from,
              to: move.to,
              promotion: move.promotion as any
            });
            // If it's a legal move but wrong, we don't update the game state
            // The puzzle game remains in its original state
          } catch {
            // Illegal move - user tried an invalid move
          }
          
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

  const startPuzzle = useCallback((puzzle: ChessPuzzle) => {
    setGameMode('puzzle');
    
    // Validate the puzzle before starting
    const validation = validatePuzzle(puzzle);
    
    if (!validation.valid) {
      console.error(`Puzzle ${puzzle.id} is invalid: ${validation.error}`);
      console.error(`FEN: ${puzzle.fen}`);
      console.error(`Solution: ${puzzle.solution}`);
      // Still load the puzzle but log the error - user can try it anyway
    }
    
    try {
      const puzzleGame = new Chess(puzzle.fen);
      const turn = puzzle.fen.split(' ')[1];
      
      setGame(puzzleGame);
      setGameState({
        fen: puzzle.fen,
        gameMode: 'puzzle',
        status: 'playing',
        currentPlayer: turn as 'w' | 'b',
        moveHistory: [],
        currentPuzzle: puzzle,
        puzzleSolved: false,
      });
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error(`Puzzle ${puzzle.id}: Error loading puzzle -`, error);
    }
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
    return game.moves({ square: square as any, verbose: true });
  }, [game]);

  const updateMultiplayerGame = useCallback((fen: string, moveHistory: string[], status: string, currentPlayer: 'w' | 'b', winner?: 'w' | 'b' | 'draw', gameId?: string, playerColor?: 'w' | 'b') => {
    const chess = new Chess(fen);
    setGame(chess);
    
    const gameStatus = status === 'playing' ? 'playing' : 
                      status === 'finished' ? (winner === 'w' ? 'checkmate' : winner === 'b' ? 'checkmate' : 'draw') : 'playing';
    
    setGameState(prev => ({
      ...prev,
      fen,
      gameMode: 'multiplayer',
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
