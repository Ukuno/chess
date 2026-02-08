import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const stats = await prisma.gameStats.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ gamesWon: 'desc' }, { puzzlesSolved: 'desc' }],
      take: 50,
    });

    const leaderboard = stats.map((s) => ({
      rank: 0,
      userId: s.userId,
      name: s.user.name || s.user.email?.split('@')[0] || 'Anonymous',
      email: s.user.email,
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      puzzlesSolved: s.puzzlesSolved,
      puzzlesAttempted: s.puzzlesAttempted,
    }));

    leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
