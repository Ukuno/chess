import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate a unique game ID
    const gameId = randomBytes(8).toString('hex');

    // Create a new game with the current user as white player
    const game = await prisma.game.create({
      data: {
        gameId,
        whitePlayerId: session.user.id,
        status: 'waiting',
      },
    });

    return NextResponse.json(
      { gameId: game.gameId, game },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

