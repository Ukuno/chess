import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    // Find the game
    const game = await prisma.game.findUnique({
      where: { gameId },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if game is already full
    if (game.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game is not available' },
        { status: 400 }
      );
    }

    // Check if user is trying to join their own game
    if (game.whitePlayerId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot join your own game' },
        { status: 400 }
      );
    }

    // Join the game as black player
    const updatedGame = await prisma.game.update({
      where: { gameId },
      data: {
        blackPlayerId: session.user.id,
        status: 'playing',
      },
      include: {
        whitePlayer: true,
        blackPlayer: true,
      },
    });

    return NextResponse.json(
      { game: updatedGame },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

