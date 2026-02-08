'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
}

export default function LeaderboardPage() {
  const { status } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => setEntries(data.leaderboard || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={status === 'authenticated' ? '/' : '/auth/login'} className="text-white hover:text-blue-200">
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Leaderboard</h1>
            <p className="text-gray-600 text-sm">Top players by games won and puzzles solved</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wins</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Played</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Puzzles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{entry.rank}</td>
                      <td className="px-4 py-3 text-gray-800">{entry.name}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{entry.gamesWon}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{entry.gamesPlayed}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{entry.puzzlesSolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="p-8 text-center text-gray-500">No players yet.</div>
          )}
        </div>

        {status === 'authenticated' && (
          <div className="mt-6 text-center">
            <Link href="/profile" className="text-white hover:text-blue-200">
              My Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
