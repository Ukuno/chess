'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GameStats {
  id: string;
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/stats')
        .then((res) => res.json())
        .then((data) => {
          setStats(data.stats || null);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <p className="text-gray-700 mb-4">You must be signed in to view your profile.</p>
          <Link
            href="/auth/login"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            href="/"
            className="text-white hover:text-blue-200"
          >
            ← Back to Game
          </Link>
          <Link
            href="/profile/change-password"
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Change Password
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile</h1>
          <p className="text-gray-600 mb-6">
            {session?.user?.name || session?.user?.email}
          </p>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Statistics</h2>
          {stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Games Played</p>
                <p className="text-2xl font-bold text-gray-800">{stats.gamesPlayed}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Games Won</p>
                <p className="text-2xl font-bold text-green-600">{stats.gamesWon}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Games Lost</p>
                <p className="text-2xl font-bold text-red-600">{stats.gamesLost}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Puzzles Solved</p>
                <p className="text-2xl font-bold text-purple-600">{stats.puzzlesSolved}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded col-span-2">
                <p className="text-sm text-gray-500">Puzzles Attempted</p>
                <p className="text-2xl font-bold text-gray-800">{stats.puzzlesAttempted}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No stats yet. Play games and solve puzzles to see your progress!</p>
          )}

          <div className="mt-8">
            <Link
              href="/leaderboard"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              View Leaderboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
