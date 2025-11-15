'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChessMove } from '@/types/chess';

interface SimpleChessBoardProps {
  position: string;
  onMove: (move: ChessMove) => void;
  isPlayerTurn: boolean;
  gameMode: 'human-vs-human' | 'human-vs-ai' | 'puzzle' | 'multiplayer';
  currentPlayer: 'w' | 'b';
  getLegalMoves?: (square: string) => any[];
}

export default function SimpleChessBoard({ 
  position, 
  onMove, 
  isPlayerTurn, 
  gameMode, 
  currentPlayer,
  getLegalMoves
}: SimpleChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);

  // Parse FEN position to get piece positions
  const parseFEN = (fen: string) => {
    const [boardPart] = fen.split(' ');
    const rows = boardPart.split('/');
    const board: (string | null)[][] = [];
    
    for (let i = 0; i < 8; i++) {
      const row: (string | null)[] = [];
      let col = 0;
      
      for (const char of rows[i]) {
        if (isNaN(parseInt(char))) {
          row[col] = char;
          col++;
        } else {
          for (let j = 0; j < parseInt(char); j++) {
            row[col] = null;
            col++;
          }
        }
      }
      board.push(row);
    }
    
    return board;
  };

  const board = parseFEN(position);

  // Clear selection when position changes (after a move)
  useEffect(() => {
    setSelectedSquare(null);
    setValidMoves([]);
  }, [position]);

  const getPieceSymbol = (piece: string | null) => {
    if (!piece) return '';
    
    const symbols: Record<string, string> = {
      'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟',
      'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };
    
    return symbols[piece] || '';
  };

  const getPieceColor = (piece: string | null) => {
    if (!piece) return '';
    return piece === piece.toUpperCase() ? 'text-white' : 'text-black';
  };

  const getSquareColor = (row: number, col: number) => {
    return (row + col) % 2 === 0 ? 'bg-gray-600 ' : 'bg-amber-600/50';
  };

  const getSquareName = (row: number, col: number) => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
  };

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!isPlayerTurn) return;

    const squareName = getSquareName(row, col);
    const piece = board[row][col];
    
    if (!selectedSquare) {
      // Select a piece - only if it belongs to the current player
      if (piece) {
        const isWhitePiece = piece === piece.toUpperCase();
        const isCurrentPlayerPiece = (currentPlayer === 'w' && isWhitePiece) || (currentPlayer === 'b' && !isWhitePiece);
        
        if (isCurrentPlayerPiece) {
          setSelectedSquare(squareName);
          // Calculate valid moves for the selected piece
          if (getLegalMoves) {
            const moves = getLegalMoves(squareName);
            const validSquares = moves.map(move => move.to);
            setValidMoves(validSquares);
          }
        }
      }
    } else {
      // Try to move
      const move: ChessMove = {
        from: selectedSquare,
        to: squareName,
      };

      console.log('Attempting move:', move);
      const success = onMove(move);
      console.log('Move success:', success);
      
      if (success) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // If move failed, select new piece if it's a valid piece of the current player
        if (piece) {
          const isWhitePiece = piece === piece.toUpperCase();
          const isCurrentPlayerPiece = (currentPlayer === 'w' && isWhitePiece) || (currentPlayer === 'b' && !isWhitePiece);
          
          if (isCurrentPlayerPiece) {
            setSelectedSquare(squareName);
            // Calculate valid moves for the newly selected piece
            if (getLegalMoves) {
              const moves = getLegalMoves(squareName);
              const validSquares = moves.map(move => move.to);
              setValidMoves(validSquares);
            }
          } else {
            setSelectedSquare(null);
            setValidMoves([]);
          }
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    }
  }, [selectedSquare, onMove, isPlayerTurn, board, getLegalMoves, currentPlayer]);

  const isSelected = (row: number, col: number) => {
    const squareName = getSquareName(row, col);
    return selectedSquare === squareName;
  };

  const isValidMove = (row: number, col: number) => {
    const squareName = getSquareName(row, col);
    return validMoves.includes(squareName);
  };

  const isValidMoveWithEnemy = (row: number, col: number) => {
    if (!isValidMove(row, col)) return false;
    const piece = board[row][col];
    if (!piece) return false; // Empty square, not an enemy piece
    
    // Check if it's an enemy piece
    const isWhitePiece = piece === piece.toUpperCase();
    const isEnemyPiece = (currentPlayer === 'w' && !isWhitePiece) || (currentPlayer === 'b' && isWhitePiece);
    return isEnemyPiece;
  };

  return (
    <div className="flex justify-center relative">
      <div >
        
        
        <div className="flex">
          
          
          {/* Chess board */}
          <div className="grid grid-cols-8">
            {board.map((row, rowIndex) =>
              row.map((piece, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    aspect-square flex items-center justify-center text-4xl cursor-pointer relative
                    ${getSquareColor(rowIndex, colIndex)}
                    ${isSelected(rowIndex, colIndex) ? 'border-2 border-orange-500' : isValidMoveWithEnemy(rowIndex, colIndex) ? 'border-2 border-red-500/50' : isValidMove(rowIndex, colIndex) ? 'border-2 border-green-500/50' : 'border-2 border-transparent'}
                    hover:bg-opacity-80
                  `}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                  {isValidMove(rowIndex, colIndex) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-2 h-2 rounded-full ${isValidMoveWithEnemy(rowIndex, colIndex) ? 'bg-red-500/50' : 'bg-green-500/50'}`}></div>
                    </div>
                  )}
                  <span className={`${getPieceColor(piece)} font-bold drop-shadow-lg z-10`}>
                    {getPieceSymbol(piece)}
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* Right coordinates (ranks 8-1) */}
          <div className="flex flex-col justify-center space-y-6 text-sm text-gray-600 ml-1">
            <span>8</span><span>7</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
          </div>
        </div>
        
        {/* Bottom coordinates (files a-h) */}
        <div className="flex">
          <div className="flex space-x-9.5 text-sm text-gray-600">
            <span>a</span><span>b</span><span>c</span><span>d</span><span>e</span><span>f</span><span>g</span><span>h</span>
          </div>
          <div className="w-8"></div> {/* Right margin */}
        </div>
      </div>
    </div>
  );
}
