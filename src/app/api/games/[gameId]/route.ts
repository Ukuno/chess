import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { gameId: params.gameId },
      include: {
        whitePlayer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this game
    if (
      game.whitePlayerId !== session.user.id &&
      game.blackPlayerId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You are not part of this game' },
        { status: 403 }
      );
    }

    return NextResponse.json({ game }, { status: 200 });
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fen, moveHistory, status, winner, currentPlayer } = await request.json();

    const game = await prisma.game.findUnique({
      where: { gameId: params.gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this game
    if (
      game.whitePlayerId !== session.user.id &&
      game.blackPlayerId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'You are not part of this game' },
        { status: 403 }
      );
    }

    // Update the game
    const updatedGame = await prisma.game.update({
      where: { gameId: params.gameId },
      data: {
        fen,
        moveHistory,
        status,
        winner,
        currentPlayer,
      },
    });

    return NextResponse.json({ game: updatedGame }, { status: 200 });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

