'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

interface GameLobbyProps {
  onGameStart: (gameId: string, playerColor: 'w' | 'b') => void;
}

export default function GameLobby({ onGameStart }: GameLobbyProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [gameId, setGameId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [createdGameId, setCreatedGameId] = useState('');

  const createGame = async () => {
    setIsCreating(true);
    setError('');
    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create game');
        return;
      }

      setCreatedGameId(data.gameId);
    } catch (error) {
      setError('Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  const joinGame = async () => {
    if (!gameId.trim()) {
      setError('Please enter a game ID');
      return;
    }

    setIsJoining(true);
    setError('');
    try {
      const response = await fetch('/api/games/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameId: gameId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join game');
        return;
      }

      // Game joined successfully, start the game as black
      onGameStart(gameId.trim(), 'b');
    } catch (error) {
      setError('Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  // Poll for opponent joining
  useEffect(() => {
    if (createdGameId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/games/${createdGameId}`);
          if (response.ok) {
            const { game } = await response.json();
            if (game && game.status === 'playing' && game.blackPlayerId) {
              // Opponent joined, start the game
              onGameStart(createdGameId, 'w');
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Error checking game status:', error);
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [createdGameId, onGameStart]);

  const startCreatedGame = () => {
    if (createdGameId) {
      onGameStart(createdGameId, 'w');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-black mb-4">Multiplayer Game</h3>

      {/* Create Game Section */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800">Create a Game</h4>
        <p className="text-sm text-gray-600">
          Create a new game and share the game ID with your opponent.
        </p>
        {createdGameId ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">
                Game Created!
              </p>
              <p className="text-sm text-gray-700 mb-2">
                Share this Game ID with your opponent:
              </p>
              <div className="bg-white border border-gray-300 rounded p-3 mb-3">
                <code className="text-lg font-mono font-bold text-gray-800">
                  {createdGameId}
                </code>
              </div>
              <button
                onClick={startCreatedGame}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Start Game (Waiting for opponent...)
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={createGame}
            disabled={isCreating}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create New Game'}
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4"></div>

      {/* Join Game Section */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800">Join a Game</h4>
        <p className="text-sm text-gray-600">
          Enter a game ID to join an existing game.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="Enter Game ID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                joinGame();
              }
            }}
          />
          <button
            onClick={joinGame}
            disabled={isJoining}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        <p className="mb-1">
          <strong>Note:</strong> For local play (same device), use "Human vs Human" mode instead.
        </p>
        <p>
          Multiplayer mode allows you to play with another user on a different device.
        </p>
      </div>
    </div>
  );
}

