import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await prisma.gameStats.findUnique({
      where: { userId: session.user.id },
    });

    if (!stats) {
      return NextResponse.json(
        { error: 'Stats not found', stats: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
