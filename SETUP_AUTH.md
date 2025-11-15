# Authentication Setup Guide

This guide will help you set up authentication with PostgreSQL for the Chess Game app.

## Prerequisites

1. PostgreSQL database installed and running
2. Node.js and npm installed

## Step 1: Install Dependencies

Run the following command to install all required packages:

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/chess_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

**Important:**
- Replace `username`, `password`, and `chess_db` with your PostgreSQL credentials
- Generate a secure random string for `NEXTAUTH_SECRET` (you can use: `openssl rand -base64 32`)
- In production, use a secure secret and update `NEXTAUTH_URL` to your production domain

## Step 3: Set Up the Database

1. Create the database in PostgreSQL:
```sql
CREATE DATABASE chess_db;
```

2. Run Prisma migrations to create the tables:
```bash
npx prisma migrate dev --name init
```

3. Generate the Prisma Client:
```bash
npx prisma generate
```

## Step 4: Start the Development Server

```bash
npm run dev
```

## Features

- **User Registration**: Users can create accounts with email and password
- **User Login**: Secure authentication using NextAuth.js
- **Session Management**: JWT-based sessions
- **Game Statistics**: Each user gets a GameStats record to track their progress
- **Password Security**: Passwords are hashed using bcrypt

## Database Schema

The database includes:
- **User**: User accounts with email and hashed passwords
- **Account**: OAuth account linking (for future OAuth providers)
- **Session**: User sessions
- **VerificationToken**: Email verification tokens
- **GameStats**: User game statistics (games played, won, lost, puzzles solved)

## API Routes

- `POST /api/auth/signup` - Create a new user account
- `GET/POST /api/auth/[...nextauth]` - NextAuth authentication endpoints

## Pages

- `/auth/login` - Login page
- `/auth/signup` - Registration page

## Next Steps

After setting up authentication, you can:
1. Add user profiles
2. Track game statistics per user
3. Add leaderboards
4. Save game history per user
5. Add OAuth providers (Google, GitHub, etc.)

