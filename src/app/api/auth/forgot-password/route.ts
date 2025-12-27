import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    console.log(`[Forgot Password] Request received for email: ${email}`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`[Forgot Password] User not found for email: ${email}`);
      // Return success even if user doesn't exist for security
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset code has been sent.' },
        { status: 200 }
      );
    }

    // Generate a 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log(`[Forgot Password] Generated code for ${email}: ${resetCode}`);

    // Delete any existing unused reset codes for this email
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        used: false,
      },
    });

    // Store reset code in database
    await prisma.passwordReset.create({
      data: {
        email,
        code: resetCode,
        expires: expiresAt,
      },
    });

    // TODO: In production, send email with reset code
    // For now, we'll log it (remove this in production!)
    console.log('\n========================================');
    console.log(`🔐 PASSWORD RESET CODE`);
    console.log(`Email: ${email}`);
    console.log(`Code: ${resetCode}`);
    console.log(`Expires: ${expiresAt.toLocaleString()}`);
    console.log('========================================\n');

    return NextResponse.json(
      { message: 'If an account with that email exists, a reset code has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

