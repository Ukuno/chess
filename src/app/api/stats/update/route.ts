import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  type: z.enum(['game_result', 'puzzle_attempt']),
  result: z.enum(['win', 'loss', 'draw']).optional(),
  solved: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const userId = session.user.id;

    const stats = await prisma.gameStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      return NextResponse.json({ error: 'Stats not found' }, { status: 404 });
    }

    if (data.type === 'game_result' && data.result) {
      await prisma.gameStats.update({
        where: { userId },
        data: {
          gamesPlayed: { increment: 1 },
          ...(data.result === 'win' && { gamesWon: { increment: 1 } }),
          ...(data.result === 'loss' && { gamesLost: { increment: 1 } }),
        },
      });
    }

    if (data.type === 'puzzle_attempt') {
      await prisma.gameStats.update({
        where: { userId },
        data: {
          puzzlesAttempted: { increment: 1 },
          ...(data.solved === true && { puzzlesSolved: { increment: 1 } }),
        },
      });
    }

    const updated = await prisma.gameStats.findUnique({
      where: { userId },
    });

    return NextResponse.json({ stats: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Stats update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
